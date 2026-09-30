require("dotenv").config({ quiet: true });

const express = require("express");
const sql = require("msnodesqlv8");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

const connectionString =
    `Driver={ODBC Driver 17 for SQL Server};` +
    `Server=${process.env.DB_SERVER},${process.env.DB_PORT};` +
    `Database=${process.env.DB_DATABASE};` +
    `Trusted_Connection=Yes;` +
    `TrustServerCertificate=Yes;`;

router.get("/stats", authMiddleware, (req, res) => {
    const query = `
        SELECT
            (
                SELECT COUNT(*)
                FROM Meetings
                WHERE YEAR(MeetingDate) = YEAR(GETDATE())
                  AND MONTH(MeetingDate) = MONTH(GETDATE())
            ) AS MeetingsThisMonth,

            (
                SELECT COUNT(*)
                FROM Decisions
                WHERE ImplementationStatus NOT IN (
                    'Implemented',
                    'Not Implemented'
                )
            ) AS OpenDecisions,

            (
                SELECT COUNT(*)
                FROM Decisions
                WHERE ImplementationStatus = 'Implemented'
            ) AS ImplementedDecisions,

            (
                SELECT COUNT(*)
                FROM ActionItems
                WHERE Status NOT IN (
                    'Completed',
                    'Cancelled'
                )
            ) AS OpenActions,

            (
                SELECT COUNT(*)
                FROM ActionItems
                WHERE Deadline < CAST(GETDATE() AS DATE)
                  AND Status NOT IN (
                    'Completed',
                    'Cancelled'
                  )
            ) AS OverdueActions,

            (
                SELECT COUNT(*)
                FROM ActionItems
                WHERE Status = 'Completed'
            ) AS CompletedActions
    `;

    sql.query(connectionString, query, (error, rows) => {
        if (error) {
            console.error(error);

            return res.status(500).json({
                message: "Dashboard statistics could not be loaded."
            });
        }

        res.status(200).json(rows[0]);
    });
});

router.get("/overview", authMiddleware, (req, res) => {
    const query = `
        SELECT
            (
                SELECT TOP 5
                    a.Id,
                    a.Title,
                    a.Deadline,
                    a.Priority,
                    a.Status,
                    a.Progress,
                    u.FullName AS ResponsiblePerson
                FROM ActionItems a
                INNER JOIN Users u
                    ON a.ResponsibleUserId = u.Id
                WHERE a.Deadline >= CAST(GETDATE() AS DATE)
                  AND a.Status NOT IN ('Completed', 'Cancelled')
                ORDER BY a.Deadline ASC
                FOR JSON PATH
            ) AS UpcomingDeadlines,

            (
                SELECT TOP 5
                    a.Id,
                    a.Title,
                    a.Deadline,
                    a.Priority,
                    a.Status,
                    a.Progress,
                    u.FullName AS ResponsiblePerson
                FROM ActionItems a
                INNER JOIN Users u
                    ON a.ResponsibleUserId = u.Id
                WHERE a.Deadline < CAST(GETDATE() AS DATE)
                  AND a.Status NOT IN ('Completed', 'Cancelled')
                ORDER BY a.Deadline ASC
                FOR JSON PATH
            ) AS OverdueActions,

            (
                SELECT TOP 5
                    d.Id,
                    d.Title,
                    d.ImplementationStatus,
                    d.CreatedAt
                FROM Decisions d
                LEFT JOIN ActionItems a
                    ON d.Id = a.DecisionId
                WHERE a.Id IS NULL
                ORDER BY d.CreatedAt DESC
                FOR JSON PATH
            ) AS DecisionsWaitingForAction,

            (
                SELECT TOP 5
                    d.Id,
                    d.Title,
                    d.ImplementationStatus,
                    d.FinalResult,
                    d.CreatedAt
                FROM Decisions d
                WHERE d.ImplementationStatus = 'Implemented'
                ORDER BY d.CreatedAt DESC
                FOR JSON PATH
            ) AS RecentlyCompletedDecisions,

            (
                SELECT TOP 5
                    Id,
                    Title,
                    MeetingDate,
                    Location
                FROM Meetings
                WHERE MeetingDate >= GETDATE()
                ORDER BY MeetingDate ASC
                FOR JSON PATH
            ) AS UpcomingMeetings
    `;

    sql.query(connectionString, query, (error, rows) => {
        if (error) {
            console.error(error);

            return res.status(500).json({
                message: "Dashboard overview could not be loaded."
            });
        }

        const data = rows[0];

        try {
            res.status(200).json({
                upcomingDeadlines: JSON.parse(
                    data.UpcomingDeadlines || "[]"
                ),

                overdueActions: JSON.parse(
                    data.OverdueActions || "[]"
                ),

                decisionsWaitingForAction: JSON.parse(
                    data.DecisionsWaitingForAction || "[]"
                ),

                recentlyCompletedDecisions: JSON.parse(
                    data.RecentlyCompletedDecisions || "[]"
                ),

                upcomingMeetings: JSON.parse(
                    data.UpcomingMeetings || "[]"
                )
            });
        } catch (parseError) {
            console.error(parseError);

            res.status(500).json({
                message: "Dashboard overview data could not be parsed."
            });
        }
    });
});

router.get("/charts", authMiddleware, (req, res) => {
    const query = `
        SELECT
            (
                SELECT
                    ImplementationStatus AS label,
                    COUNT(*) AS value
                FROM Decisions
                GROUP BY ImplementationStatus
                FOR JSON PATH
            ) AS DecisionImplementationStatus,

            (
                SELECT
                    Status AS label,
                    COUNT(*) AS value
                FROM ActionItems
                GROUP BY Status
                FOR JSON PATH
            ) AS ActionStatusDistribution,

            (
                SELECT
                    Priority AS label,
                    COUNT(*) AS value
                FROM ActionItems
                GROUP BY Priority
                FOR JSON PATH
            ) AS PriorityDistribution
    `;

    sql.query(connectionString, query, (error, rows) => {
        if (error) {
            console.error(error);

            return res.status(500).json({
                message: "Dashboard chart data could not be loaded."
            });
        }

        const data = rows[0];

        try {
            res.status(200).json({
                decisionImplementationStatus: JSON.parse(
                    data.DecisionImplementationStatus || "[]"
                ),

                actionStatusDistribution: JSON.parse(
                    data.ActionStatusDistribution || "[]"
                ),

                priorityDistribution: JSON.parse(
                    data.PriorityDistribution || "[]"
                )
            });
        } catch (parseError) {
            console.error(parseError);

            res.status(500).json({
                message: "Dashboard chart data could not be parsed."
            });
        }
    });
});

module.exports = router;