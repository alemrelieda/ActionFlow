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


/* =========================
   GET ALL MEETINGS
========================= */

router.get("/", authMiddleware, (req, res) => {
    const query = `
        SELECT
            m.Id,
            m.Title,
            m.Description,
            m.MeetingDate,
            m.Location,
            m.Notes,
            m.CreatedBy,
            m.CreatedAt,
            u.FullName AS CreatedByName,

            (
                SELECT COUNT(*)
                FROM Decisions d
                WHERE d.MeetingId = m.Id
            ) AS DecisionCount,

            (
                SELECT COUNT(*)
                FROM MeetingParticipants mp
                WHERE mp.MeetingId = m.Id
            ) AS ParticipantCount

        FROM Meetings m

        INNER JOIN Users u
            ON m.CreatedBy = u.Id

        ORDER BY m.MeetingDate DESC
    `;

    sql.query(
        connectionString,
        query,
        (error, rows) => {
            if (error) {
                console.error(
                    "Load meetings error:",
                    error
                );

                return res.status(500).json({
                    message:
                        "Meetings could not be loaded."
                });
            }

            return res.status(200).json({
                count:
                    rows ? rows.length : 0,

                meetings:
                    rows || []
            });
        }
    );
});


/* =========================
   GET MEETING DETAIL
========================= */

router.get(
    "/:meetingId",
    authMiddleware,
    (req, res) => {
        const meetingId =
            Number(req.params.meetingId);

        if (
            !Number.isInteger(meetingId) ||
            meetingId <= 0
        ) {
            return res.status(400).json({
                message:
                    "Invalid meeting id."
            });
        }

        const query = `
            SELECT
                m.Id,
                m.Title,
                m.Description,
                m.MeetingDate,
                m.Location,
                m.Notes,
                m.CreatedBy,
                m.CreatedAt,
                u.FullName AS CreatedByName,

                (
                    SELECT COUNT(*)
                    FROM Decisions d
                    WHERE d.MeetingId = m.Id
                ) AS DecisionCount,

                (
                    SELECT COUNT(*)
                    FROM MeetingParticipants mp
                    WHERE mp.MeetingId = m.Id
                ) AS ParticipantCount

            FROM Meetings m

            INNER JOIN Users u
                ON m.CreatedBy = u.Id

            WHERE m.Id = ?
        `;

        sql.query(
            connectionString,
            query,
            [meetingId],
            (error, rows) => {
                if (error) {
                    console.error(
                        "Load meeting detail error:",
                        error
                    );

                    return res.status(500).json({
                        message:
                            "Meeting could not be loaded."
                    });
                }

                if (
                    !rows ||
                    rows.length === 0
                ) {
                    return res.status(404).json({
                        message:
                            "Meeting not found."
                    });
                }

                return res.status(200).json({
                    meeting:
                        rows[0]
                });
            }
        );
    }
);


/* =========================
   CREATE MEETING
========================= */

router.post(
    "/",
    authMiddleware,
    (req, res) => {
        const {
            title,
            meetingDate,
            location,
            description,
            notes
        } = req.body;

        if (
            !title ||
            !meetingDate
        ) {
            return res.status(400).json({
                message:
                    "Meeting title and meeting date are required."
            });
        }

        /*
            HTML datetime-local örneği:

            2026-09-01T14:00

            SQL Server için:

            2026-09-01 14:00:00
        */

        let normalizedMeetingDate =
            String(meetingDate)
                .trim()
                .replace("T", " ");

        if (
            normalizedMeetingDate.length === 16
        ) {
            normalizedMeetingDate +=
                ":00";
        }

        const query = `
            INSERT INTO Meetings (
                Title,
                Description,
                MeetingDate,
                Location,
                Notes,
                CreatedBy
            )
            VALUES (
                ?,
                ?,
                CONVERT(DATETIME2, ?, 120),
                ?,
                ?,
                ?
            )
        `;

        const parameters = [
            title.trim(),

            description
                ? description.trim()
                : null,

            normalizedMeetingDate,

            location
                ? location.trim()
                : null,

            notes
                ? notes.trim()
                : null,

            req.user.userId
        ];

        sql.query(
            connectionString,
            query,
            parameters,
            (error) => {
                if (error) {
                    console.error(
                        "Create meeting error:",
                        error
                    );

                    return res.status(500).json({
                        message:
                            "Meeting could not be created."
                    });
                }

                return res.status(201).json({
                    message:
                        "Meeting created successfully."
                });
            }
        );
    }
);


module.exports = router;