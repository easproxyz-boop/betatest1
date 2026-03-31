require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const axios = require('axios');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');
const redis = require('redis');
const { RedisStore } = require('connect-redis');
const pool_useraccount = require('./config/db.useraccount.nodejs');
const getPHDateTime = require('./helper/dateNowPH');


const app = express();
const server = http.createServer(app);

const WEB_FRONTEND_ENDPOINT = process.env.WEB_FRONTEND_ENDPOINT;
const OFFICE_HRMO_ENDPOINT = process.env.OFFICE_HRMO_ENDPOINT;

// Trust proxy (for secure cookies behind proxies)
app.set('trust proxy', 1);

/* =====================================================
   CORS SETUP
===================================================== */
/* =====================================================
   CORS SETUP (using array/map)
===================================================== */
const allowedOrigins = [
  //WEB_FRONTEND_ENDPOINT, // from env or fallback
  //OFFICE_HRMO_ENDPOINT,
  'http://localhost:5173',
  'http://localhost:5174'
];


app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));


/* =====================================================
   REDIS CLIENT
===================================================== */
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://127.0.0.1:6379'
});

redisClient.on('error', (err) => console.error('❌ Redis error:', err));

(async () => {
  await redisClient.connect();
  console.log('✅ Redis connected');
})();

/* =====================================================
   SESSION (USING REDIS)
===================================================== */
app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET || 'SECRET123',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production', // secure only in production
    httpOnly: true,
    sameSite: 'lax'
  }
}));


/* =====================================================
   PASSPORT CONFIG
===================================================== */
app.use(passport.initialize());
app.use(passport.session());

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_REDIRECT_URI
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const user = {
      id: profile.id,
      name: profile.displayName,
      email: profile.emails?.[0]?.value,
      picture: profile.photos?.[0]?.value,
      accessToken,
      refreshToken
    };
    done(null, user);
  } catch (err) {
    done(err, null);
  }
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

/* =====================================================
   ROUTES
===================================================== */





app.get('/server/web/auth/google', 
  passport.authenticate('google', { scope: ['profile', 'email'] })
);


// Google OAuth callback
app.get(
  '/server/web/auth/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${WEB_FRONTEND_ENDPOINT}/root/sign-in`,
  }),
  (req, res) => {
    // After successful Google login
    res.redirect('/server/gg/session/handler/123');
  }
);

// =====================================================
// GOOGLE SESSION HANDLER
// =====================================================

app.use('/', require('./session_handler/ss.handler'));




app.get('/server/web/sign-out', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(err => {
      if (err) {
        return res.json({ status: 'error', message: 'Failed to sign out' });
      }
      res.json({ status: 'ok', message: 'Signed out successfully' });
    });
  });
});


app.post('/server/web/revoke/google', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ status: 'error', message: 'User not logged in' });

    const token = req.user.refreshToken || req.user.accessToken;

    if (!token) return res.status(400).json({ status: 'error', message: 'No token found for user' });

    await axios.post(`https://oauth2.googleapis.com/revoke?token=${token}`,
      null,
      { headers: { 'Content-type': 'application/x-www-form-urlencoded' } }
    );

    req.logout((err) => {
      if (err) console.error(err);
      req.session.destroy(() => {
        res.json({ status: 'success', message: 'Access revoked successfully' });
      });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Failed to revoke Google access' });
  }
});






/* =====================================================
   MIDDLEWARE & PARSERS
===================================================== */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// ✅ Corrected DB check route
app.get('/check-db', async (req, res) => {
  try {
    await pool_useraccount.query('SELECT 1');
    res.json({ status: 'success', message: '✅ MySQL database connected successfully!' });
  } catch (err) {
    console.error('DB CHECK ERROR:', err);
    res.status(500).json({ status: 'error', message: '❌ Database connection failed', error: err.message });
  }
});



/* =====================================================
   SOCKET.IO SETUP
===================================================== */
const io = new Server(server, {
  cors: {
    origin: WEB_FRONTEND_ENDPOINT,
    methods: ['GET', 'POST'],
    credentials: true
  }
});







/* =====================================================
   CUSTOM MIDDLEWARE
===================================================== */
app.use('/', require('./session_handler/getdata.handler.login'));
app.use('/', require('./session_handler/insertdata.hadler.login'));

app.use('/', require('./middleware/_0useraccount/getdata/_0_manage_account/getdata_google_user_account_lists'));


//LOCAL ADDRESS =====================================================
//getdata

//LOCAL ADDRESS =====================================================
//OFFICE =====================================================
//getdata
app.use('/', require('./utils/getdata_load_department'));
app.use('/', require('./utils/getdata_load_department_employee_profile_info'));


//OFFICE =====================================================



//USER ACCOUNT =====================================================
//getdata
app.use('/', require('./middleware/_0useraccount/getdata/_0_useraccount_google/getdata_google_user_authentication'));
app.use('/', require('./middleware/_0useraccount/getdata/_0_manage_account/getdata_google_user_authentication'));
app.use('/', require('./middleware/_0useraccount/getdata/_0_manage_account/getdata_google_user_account_active_status'));
//insertdata
app.use('/', require('./middleware/_0useraccount/insertdata/_0_gettingstarted/insertdata_step1_sss111'));
app.use('/', require('./middleware/_0useraccount/insertdata/_0_gettingstarted/insertdata_step2_sss222'));
app.use('/', require('./middleware/_0useraccount/insertdata/_0_gettingstarted/insertdata_step3_sss333'));
app.use('/', require('./middleware/_0useraccount/insertdata/_0_manage_account/insertdata_new_user_uuu111')(io));
app.use('/', require('./middleware/_0useraccount/insertdata/_0_manage_account/insertdata_new_user_uuu222')(io));

//tabledata
app.use('/', require('./middleware/_0useraccount/tabledata/_0_manage_account/tabledata_google_user_authentication'));
//USER ACCOUNT =====================================================


//QRCODE SCANNER
app.use('/', require('./middleware/_0office_department/hrmo/insertdata/insertdata_employee_attendance_scanner_qrcode_add')(io));
//QRCODE SCANNER


//WORFLOW  =====================================================
//HRMO 
app.use('/', require('./middleware/_0workflow/office_department/hrmo/insertdata/insertdata_workflow_employee_attendance_log_add')(io));

//GETDATA
app.use('/', require('./middleware/_0workflow/office_department/hrmo/getdata/getdata_workflow_employee_attendance_log'));


//timeline
app.use('/', require('./middleware/_0workflow/office_department/hrmo/timeline/timeline.hrmo'));
//WORFLOW  =====================================================




//HRMO
//employee profile info
app.use('/', require('./middleware/_0office_department/hrmo/insertdata/insertdata_employee_profile_info_add')(io));
app.use('/', require('./middleware/_0office_department/hrmo/insertdata/insertdata_employee_profile_info_edit')(io));

//Attendance log
app.use('/', require('./middleware/_0office_department/hrmo/insertdata/insertdata_employee_attendance_log_add')(io));
app.use('/', require('./middleware/_0office_department/hrmo/insertdata/insertdata_employee_attendance_log_edit')(io));

//Daily time record
app.use('/', require('./middleware/_0office_department/hrmo/insertdata/insertdata_employee_daily_time_record_add')(io));
app.use('/', require('./middleware/_0office_department/hrmo/insertdata/insertdata_employee_daily_time_record_edit')(io));

app.use('/', require('./middleware/_0office_department/hrmo/getdata/getdata_employee_profile_info'));
app.use('/', require('./middleware/_0office_department/hrmo/getdata/getdata_employee_attendance_log'));
app.use('/', require('./middleware/_0office_department/hrmo/getdata/getdata_employee_attendance_log_dtr'));
app.use('/', require('./middleware/_0office_department/hrmo/getdata/getdata_employee_daily_time_record'));

app.use('/', require('./middleware/_0office_department/hrmo/getdata/getdata_employee_0_csc_form_daily_time_record_dtr'));


app.use('/', require('./middleware/_0office_department/hrmo/tabledata/tabledata_employee_profile_info'));
app.use('/', require('./middleware/_0office_department/hrmo/tabledata/tabledata_employee_attendance_log'));
app.use('/', require('./middleware/_0office_department/hrmo/tabledata/tabledata_employee_daily_time_record'));

//employee profile info

//HRMO

/* =====================================================
   SOCKET.IO CONNECTION
===================================================== */
USER_ACTIVE_STATUS = async (userEmailIO, statusType) => {
  try {
    // Get user's external ID
    const [rowAccMain] = await pool_useraccount.query(
      `SELECT dt_external_id 
       FROM tbl_user_account_main 
       WHERE dt_google_email = ? 
       ORDER BY dt_num DESC 
       LIMIT 1`,
      [userEmailIO]
    );

    if (!rowAccMain.length) {
      throw new Error('USER_NOT_FOUND');
    }

    const dt_external_id = rowAccMain[0].dt_external_id;
    const fullDateTime = getPHDateTime(); // must be YYYY-MM-DD HH:mm:ss

    // Insert or update active status
    await pool_useraccount.query(
      `INSERT INTO tbl_user_active_status
       (dt_date_added, dt_active_type, dt_external_id)
       VALUES (?, ?, ?)`,
      [
        fullDateTime,
        statusType,
        dt_external_id
      ]
    );
  io.to('user_connected_rrr').emit('load_user_connected_rrr');

  } catch (err) {
    console.error('USER_ACTIVE_STATUS error:', err);
  }
};


io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  const joinRoomOnce = (roomName) => {
    if (socket.rooms.has(roomName)) return;
    socket.join(roomName);
    console.log(`Socket ${socket.id} joined room: ${roomName}`);
  };
  socket.on('join_room_user_connected_rrr', joinRoomOnce);
  socket.on('join_room_general_notify_999GGG', joinRoomOnce);

//MANAGE ACCOUNT
  socket.on('join_room_table_manage_account_users_uuu111', joinRoomOnce);
//MANAGE ACCOUNT


//workflow
  
  socket.on('join_room_table_office_hrmo_workflow_wwwhhh', joinRoomOnce);

//HRMO
  socket.on('join_room_table_hrmo_employee_profile_information_mmm111', joinRoomOnce);
  socket.on('join_room_table_hrmo_employee_attendance_log_aaa111', joinRoomOnce);
  socket.on('join_room_table_hrmo_employee_daily_time_record_ddd111', joinRoomOnce);
//HRMO


   // Assume client sends their userId after connecting
    socket.on('user_connected', (userEmailIO) => {
        socket.userEmailIO = userEmailIO; // save userEmailIO on socket object
        console.log(`User ${userEmailIO} is online`);
        USER_ACTIVE_STATUS(socket.userEmailIO, 'ONLINE'); // mark as online
    });


    // Handle disconnect
    socket.on('disconnect', () => {
        if (socket.userEmailIO) {
            console.log(`User ${socket.userEmailIO} is offline`);
          USER_ACTIVE_STATUS(socket.userEmailIO, 'OFFLINE'); // mark as offline

        }

    });


});




/* =====================================================
   START SERVER
===================================================== */
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
