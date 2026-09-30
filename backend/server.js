require("dotenv").config({ quiet: true });

const express = require("express");
const sql = require("msnodesqlv8");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const meetingsRoutes = require("./routes/meetings");
const participantsRoutes = require("./routes/participants");
const decisionsRoutes = require("./routes/decisions");
const actionsRoutes = require("./routes/actions");
const commentsRoutes = require("./routes/comments");
const dashboardRoutes = require("./routes/dashboard");
const authMiddleware = require("./middleware/authMiddleware");

const app = express();

const PORT =
    process.env.PORT || 3000;


/* =========================
   CORS
========================= */

const allowedOrigins = [
    "http://localhost:5500",
    "http://127.0.0.1:5500"
];

/*
    İleride frontend deploy edildiğinde
    FRONTEND_URL .env üzerinden eklenecek.

    Örnek:
    FRONTEND_URL=https://actionflow.example.com
*/

if (process.env.FRONTEND_URL) {
    allowedOrigins.push(
        process.env.FRONTEND_URL
    );
}

app.use(
    cors({
        origin: (origin, callback) => {

            /*
                Postman / curl / server-to-server
                isteklerinde origin olmayabilir.
            */
            if (!origin) {
                return callback(
                    null,
                    true
                );
            }

            if (
                allowedOrigins.includes(
                    origin
                )
            ) {
                return callback(
                    null,
                    true
                );
            }

            return callback(
                new Error(
                    "CORS policy does not allow this origin."
                )
            );
        },

        methods: [
            "GET",
            "POST",
            "PATCH",
            "DELETE",
            "OPTIONS"
        ],

        allowedHeaders: [
            "Content-Type",
            "Authorization"
        ]
    })
);


/* =========================
   JSON
========================= */

app.use(
    express.json({
        limit: "1mb"
    })
);


/* =========================
   ROUTES
========================= */

app.use(
    "/api/auth",
    authRoutes
);

app.use(
    "/api/meetings",
    meetingsRoutes
);

app.use(
    "/api/meetings",
    participantsRoutes
);

/*
    Decision oluşturma:
    POST /api/meetings/:meetingId/decisions
*/

app.use(
    "/api/meetings",
    decisionsRoutes
);

/*
    Decision işlemleri:
    GET /api/decisions/:decisionId/progress
    PATCH /api/decisions/:decisionId/implementation-status
*/

app.use(
    "/api/decisions",
    decisionsRoutes
);

/*
    Action işlemleri:
    POST /api/decisions/:decisionId/actions
    GET /api/decisions/actions
    GET /api/decisions/actions/kanban
    PATCH /api/decisions/actions/:actionId/status
    PATCH /api/decisions/actions/:actionId/progress
    PATCH /api/decisions/actions/:actionId/result
    GET /api/decisions/actions/:actionId/history
    GET /api/decisions/actions/:actionId
    DELETE /api/decisions/actions/:actionId
*/

app.use(
    "/api/decisions",
    actionsRoutes
);

/*
    Comment işlemleri:
    POST /api/actions/:actionId/comments
    GET /api/actions/:actionId/comments
*/

app.use(
    "/api",
    commentsRoutes
);

/*
    Dashboard işlemleri:
    GET /api/dashboard/stats
    GET /api/dashboard/overview
    GET /api/dashboard/charts
*/

app.use(
    "/api/dashboard",
    dashboardRoutes
);


/* =========================
   DATABASE CONNECTION STRING
========================= */

const connectionString =
    `Driver={ODBC Driver 17 for SQL Server};` +
    `Server=${process.env.DB_SERVER},${process.env.DB_PORT};` +
    `Database=${process.env.DB_DATABASE};` +
    `Trusted_Connection=Yes;` +
    `TrustServerCertificate=Yes;`;


/* =========================
   ROOT
========================= */

app.get(
    "/",
    (req, res) => {
        res.send(
            "ActionFlow API is running."
        );
    }
);


/* =========================
   HEALTH
========================= */

app.get(
    "/health",
    (req, res) => {
        res.status(200).json({
            status: "OK",
            message:
                "ActionFlow API is healthy"
        });
    }
);


/* =========================
   PROTECTED TEST
========================= */

app.get(
    "/api/protected",
    authMiddleware,
    (req, res) => {
        res.status(200).json({
            message:
                "Protected route accessed successfully.",

            user:
                req.user
        });
    }
);


/* =========================
   404
========================= */

app.use(
    (req, res) => {
        res.status(404).json({
            message:
                "Route not found."
        });
    }
);


/* =========================
   ERROR HANDLER
========================= */

app.use(
    (error, req, res, next) => {

        console.error(
            "Server error:",
            error
        );

        if (
            error.message ===
            "CORS policy does not allow this origin."
        ) {
            return res.status(403).json({
                message:
                    "Origin is not allowed."
            });
        }

        return res.status(500).json({
            message:
                "Internal server error."
        });
    }
);


/* =========================
   START SERVER
========================= */

app.listen(
    PORT,
    () => {
        console.log(
            `ActionFlow server is running on port ${PORT}`
        );
    }
);


/* =========================
   DATABASE TEST
========================= */

sql.query(
    connectionString,
    "SELECT 1 AS Test",
    (error) => {
        if (error) {
            console.error(
                "SQL Server connection failed:"
            );

            console.error(
                error
            );

            return;
        }

        console.log(
            "SQL Server connected successfully."
        );
    }
);