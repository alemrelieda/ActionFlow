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
   CHECK MEETING ACCESS
========================= */

function checkMeetingAccess(
    meetingId,
    userId,
    callback
) {
    const query = `
        SELECT
            m.Id,
            m.CreatedBy
        FROM Meetings m
        WHERE
            m.Id = ?
            AND (
                m.CreatedBy = ?
                OR EXISTS (
                    SELECT 1
                    FROM MeetingParticipants mp
                    WHERE
                        mp.MeetingId = m.Id
                        AND mp.UserId = ?
                )
            )
    `;

    sql.query(
        connectionString,
        query,
        [
            meetingId,
            userId,
            userId
        ],
        (error, rows) => {
            if (error) {
                return callback(
                    error,
                    null
                );
            }

            if (
                !rows ||
                rows.length === 0
            ) {
                return callback(
                    null,
                    null
                );
            }

            return callback(
                null,
                rows[0]
            );
        }
    );
}


/* =========================
   CHECK MEETING CREATOR
========================= */

function checkMeetingCreator(
    meetingId,
    userId,
    callback
) {
    const query = `
        SELECT
            Id,
            CreatedBy
        FROM Meetings
        WHERE
            Id = ?
            AND CreatedBy = ?
    `;

    sql.query(
        connectionString,
        query,
        [
            meetingId,
            userId
        ],
        (error, rows) => {
            if (error) {
                return callback(
                    error,
                    null
                );
            }

            if (
                !rows ||
                rows.length === 0
            ) {
                return callback(
                    null,
                    null
                );
            }

            return callback(
                null,
                rows[0]
            );
        }
    );
}


/* =========================
   GET MEETING PARTICIPANTS
========================= */

router.get(
    "/:meetingId/participants",
    authMiddleware,
    (req, res) => {
        const meetingId =
            Number(req.params.meetingId);

        const userId =
            Number(req.user.userId);

        if (
            !Number.isInteger(meetingId) ||
            meetingId <= 0
        ) {
            return res.status(400).json({
                message:
                    "Valid meeting ID is required."
            });
        }

        checkMeetingAccess(
            meetingId,
            userId,
            (accessError, meeting) => {
                if (accessError) {
                    console.error(
                        "Check meeting access error:",
                        accessError
                    );

                    return res.status(500).json({
                        message:
                            "Meeting access could not be checked."
                    });
                }

                if (!meeting) {
                    return res.status(403).json({
                        message:
                            "You do not have permission to view participants for this meeting."
                    });
                }

                const query = `
                    SELECT
                        mp.MeetingId,
                        mp.UserId,
                        u.FullName,
                        u.Email

                    FROM MeetingParticipants mp

                    INNER JOIN Users u
                        ON mp.UserId = u.Id

                    WHERE mp.MeetingId = ?

                    ORDER BY u.FullName ASC
                `;

                sql.query(
                    connectionString,
                    query,
                    [meetingId],
                    (error, rows) => {
                        if (error) {
                            console.error(
                                "Load participants error:",
                                error
                            );

                            return res.status(500).json({
                                message:
                                    "Participants could not be loaded."
                            });
                        }

                        return res.status(200).json({
                            count:
                                rows ? rows.length : 0,

                            participants:
                                rows || []
                        });
                    }
                );
            }
        );
    }
);


/* =========================
   GET AVAILABLE PARTICIPANTS
========================= */

router.get(
    "/:meetingId/available-participants",
    authMiddleware,
    (req, res) => {
        const meetingId =
            Number(req.params.meetingId);

        const userId =
            Number(req.user.userId);

        if (
            !Number.isInteger(meetingId) ||
            meetingId <= 0
        ) {
            return res.status(400).json({
                message:
                    "Valid meeting ID is required."
            });
        }

        checkMeetingCreator(
            meetingId,
            userId,
            (creatorError, meeting) => {
                if (creatorError) {
                    console.error(
                        "Check meeting creator error:",
                        creatorError
                    );

                    return res.status(500).json({
                        message:
                            "Meeting ownership could not be checked."
                    });
                }

                if (!meeting) {
                    return res.status(403).json({
                        message:
                            "Only the meeting creator can view available participants."
                    });
                }

                const query = `
                    SELECT
                        u.Id,
                        u.FullName,
                        u.Email

                    FROM Users u

                    WHERE
                        u.Id <> ?
                        AND NOT EXISTS (
                            SELECT 1
                            FROM MeetingParticipants mp
                            WHERE
                                mp.MeetingId = ?
                                AND mp.UserId = u.Id
                        )

                    ORDER BY u.FullName ASC
                `;

                sql.query(
                    connectionString,
                    query,
                    [
                        userId,
                        meetingId
                    ],
                    (error, rows) => {
                        if (error) {
                            console.error(
                                "Load available participants error:",
                                error
                            );

                            return res.status(500).json({
                                message:
                                    "Available participants could not be loaded."
                            });
                        }

                        return res.status(200).json({
                            count:
                                rows ? rows.length : 0,

                            users:
                                rows || []
                        });
                    }
                );
            }
        );
    }
);


/* =========================
   ADD PARTICIPANT
========================= */

router.post(
    "/:meetingId/participants",
    authMiddleware,
    (req, res) => {
        const meetingId =
            Number(req.params.meetingId);

        const userId =
            Number(req.body.userId);

        const currentUserId =
            Number(req.user.userId);

        if (
            !Number.isInteger(meetingId) ||
            meetingId <= 0 ||
            !Number.isInteger(userId) ||
            userId <= 0
        ) {
            return res.status(400).json({
                message:
                    "Meeting ID and user ID are required."
            });
        }

        checkMeetingCreator(
            meetingId,
            currentUserId,
            (creatorError, meeting) => {
                if (creatorError) {
                    console.error(
                        "Check meeting creator error:",
                        creatorError
                    );

                    return res.status(500).json({
                        message:
                            "Meeting ownership could not be checked."
                    });
                }

                if (!meeting) {
                    return res.status(403).json({
                        message:
                            "Only the meeting creator can add participants."
                    });
                }

                const userQuery = `
                    SELECT
                        Id
                    FROM Users
                    WHERE Id = ?
                `;

                sql.query(
                    connectionString,
                    userQuery,
                    [userId],
                    (userError, userRows) => {
                        if (userError) {
                            console.error(
                                "Check participant user error:",
                                userError
                            );

                            return res.status(500).json({
                                message:
                                    "User could not be checked."
                            });
                        }

                        if (
                            !userRows ||
                            userRows.length === 0
                        ) {
                            return res.status(404).json({
                                message:
                                    "User not found."
                            });
                        }

                        if (
                            userId ===
                            currentUserId
                        ) {
                            return res.status(400).json({
                                message:
                                    "The meeting creator does not need to be added as a participant."
                            });
                        }

                        const duplicateQuery = `
                            SELECT
                                MeetingId,
                                UserId

                            FROM MeetingParticipants

                            WHERE
                                MeetingId = ?
                                AND UserId = ?
                        `;

                        sql.query(
                            connectionString,
                            duplicateQuery,
                            [
                                meetingId,
                                userId
                            ],
                            (
                                checkError,
                                existingRows
                            ) => {
                                if (
                                    checkError
                                ) {
                                    console.error(
                                        "Check duplicate participant error:",
                                        checkError
                                    );

                                    return res
                                        .status(500)
                                        .json({
                                            message:
                                                "Participant could not be checked."
                                        });
                                }

                                if (
                                    existingRows &&
                                    existingRows.length > 0
                                ) {
                                    return res
                                        .status(409)
                                        .json({
                                            message:
                                                "This user is already a participant."
                                        });
                                }

                                const insertQuery = `
                                    INSERT INTO MeetingParticipants (
                                        MeetingId,
                                        UserId
                                    )
                                    VALUES (?, ?)
                                `;

                                sql.query(
                                    connectionString,
                                    insertQuery,
                                    [
                                        meetingId,
                                        userId
                                    ],
                                    (error) => {
                                        if (
                                            error
                                        ) {
                                            console.error(
                                                "Add participant error:",
                                                error
                                            );

                                            return res
                                                .status(500)
                                                .json({
                                                    message:
                                                        "Participant could not be added."
                                                });
                                        }

                                        return res
                                            .status(201)
                                            .json({
                                                message:
                                                    "Participant added successfully."
                                            });
                                    }
                                );
                            }
                        );
                    }
                );
            }
        );
    }
);


module.exports = router;