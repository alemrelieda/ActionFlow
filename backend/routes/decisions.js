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

   Meeting creator OR
   meeting participant
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

   Only meeting creator
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
   CHECK DECISION ACCESS

   User must have access
   to the decision's meeting
========================= */

function checkDecisionAccess(
    decisionId,
    userId,
    callback
) {
    const query = `
        SELECT
            d.Id,
            d.MeetingId,
            d.CreatedBy,
            m.CreatedBy AS MeetingCreatedBy

        FROM Decisions d

        INNER JOIN Meetings m
            ON d.MeetingId = m.Id

        WHERE
            d.Id = ?
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
            decisionId,
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
   CHECK DECISION MANAGER

   Only meeting creator
   can update decision result
========================= */

function checkDecisionManager(
    decisionId,
    userId,
    callback
) {
    const query = `
        SELECT
            d.Id,
            d.MeetingId,
            d.CreatedBy,
            m.CreatedBy AS MeetingCreatedBy

        FROM Decisions d

        INNER JOIN Meetings m
            ON d.MeetingId = m.Id

        WHERE
            d.Id = ?
            AND m.CreatedBy = ?
    `;

    sql.query(
        connectionString,
        query,
        [
            decisionId,
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
   GET MEETING DECISIONS
========================= */

router.get(
    "/:meetingId/decisions",
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
                            "You do not have permission to view decisions for this meeting."
                    });
                }

                const query = `
                    SELECT
                        d.Id,
                        d.MeetingId,
                        d.Title,
                        d.Description,
                        d.ImplementationStatus,
                        d.FinalResult,
                        d.CreatedBy,
                        d.CreatedAt,
                        u.FullName AS CreatedByName,

                        (
                            SELECT COUNT(*)
                            FROM ActionItems a
                            WHERE a.DecisionId = d.Id
                        ) AS TotalActions,

                        (
                            SELECT COUNT(*)
                            FROM ActionItems a
                            WHERE
                                a.DecisionId = d.Id
                                AND a.Status = 'Completed'
                        ) AS CompletedActions

                    FROM Decisions d

                    INNER JOIN Users u
                        ON d.CreatedBy = u.Id

                    WHERE d.MeetingId = ?

                    ORDER BY d.CreatedAt DESC
                `;

                sql.query(
                    connectionString,
                    query,
                    [meetingId],
                    (error, rows) => {
                        if (error) {
                            console.error(
                                "Load decisions error:",
                                error
                            );

                            return res.status(500).json({
                                message:
                                    "Decisions could not be loaded."
                            });
                        }

                        return res.status(200).json({
                            count:
                                rows ? rows.length : 0,

                            decisions:
                                rows || []
                        });
                    }
                );
            }
        );
    }
);


/* =========================
   CREATE DECISION

   Only meeting creator
========================= */

router.post(
    "/:meetingId/decisions",
    authMiddleware,
    (req, res) => {
        const meetingId =
            Number(req.params.meetingId);

        const userId =
            Number(req.user.userId);

        const {
            title,
            description
        } = req.body;

        if (
            !Number.isInteger(meetingId) ||
            meetingId <= 0 ||
            !title ||
            !String(title).trim()
        ) {
            return res.status(400).json({
                message:
                    "Meeting ID and decision title are required."
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
                            "Only the meeting creator can create decisions."
                    });
                }

                const query = `
                    INSERT INTO Decisions (
                        MeetingId,
                        Title,
                        Description,
                        CreatedBy
                    )
                    VALUES (?, ?, ?, ?)
                `;

                const values = [
                    meetingId,

                    String(title).trim(),

                    description &&
                    String(description).trim()
                        ? String(description).trim()
                        : null,

                    userId
                ];

                sql.query(
                    connectionString,
                    query,
                    values,
                    (error) => {
                        if (error) {
                            console.error(
                                "Create decision error:",
                                error
                            );

                            return res.status(500).json({
                                message:
                                    "Decision could not be created."
                            });
                        }

                        return res.status(201).json({
                            message:
                                "Decision created successfully."
                        });
                    }
                );
            }
        );
    }
);


/* =========================
   DECISION PROGRESS

   Creator OR participant
========================= */

router.get(
    "/:decisionId/progress",
    authMiddleware,
    (req, res) => {
        const decisionId =
            Number(req.params.decisionId);

        const userId =
            Number(req.user.userId);

        if (
            !Number.isInteger(decisionId) ||
            decisionId <= 0
        ) {
            return res.status(400).json({
                message:
                    "Valid decision ID is required."
            });
        }

        checkDecisionAccess(
            decisionId,
            userId,
            (accessError, decisionAccess) => {
                if (accessError) {
                    console.error(
                        "Check decision access error:",
                        accessError
                    );

                    return res.status(500).json({
                        message:
                            "Decision access could not be checked."
                    });
                }

                if (!decisionAccess) {
                    return res.status(403).json({
                        message:
                            "You do not have permission to view this decision."
                    });
                }

                const query = `
                    SELECT
                        d.Id,
                        d.Title,
                        d.ImplementationStatus,

                        COUNT(a.Id) AS TotalActions,

                        SUM(
                            CASE
                                WHEN a.Status = 'Completed'
                                THEN 1
                                ELSE 0
                            END
                        ) AS CompletedActions

                    FROM Decisions d

                    LEFT JOIN ActionItems a
                        ON d.Id = a.DecisionId

                    WHERE d.Id = ?

                    GROUP BY
                        d.Id,
                        d.Title,
                        d.ImplementationStatus
                `;

                sql.query(
                    connectionString,
                    query,
                    [decisionId],
                    (error, rows) => {
                        if (error) {
                            console.error(
                                "Load decision progress error:",
                                error
                            );

                            return res.status(500).json({
                                message:
                                    "Decision progress could not be loaded."
                            });
                        }

                        if (
                            !rows ||
                            rows.length === 0
                        ) {
                            return res.status(404).json({
                                message:
                                    "Decision not found."
                            });
                        }

                        const decision =
                            rows[0];

                        const totalActions =
                            Number(
                                decision.TotalActions
                            ) || 0;

                        const completedActions =
                            Number(
                                decision.CompletedActions
                            ) || 0;

                        const completionPercentage =
                            totalActions === 0
                                ? 0
                                : Math.round(
                                    (
                                        completedActions /
                                        totalActions
                                    ) * 100
                                );

                        return res.status(200).json({
                            decisionId:
                                decision.Id,

                            title:
                                decision.Title,

                            totalActions,

                            completedActions,

                            completionPercentage,

                            implementationStatus:
                                decision.ImplementationStatus
                        });
                    }
                );
            }
        );
    }
);


/* =========================
   UPDATE IMPLEMENTATION STATUS

   Only meeting creator
========================= */

router.patch(
    "/:decisionId/implementation-status",
    authMiddleware,
    (req, res) => {
        const decisionId =
            Number(req.params.decisionId);

        const userId =
            Number(req.user.userId);

        const {
            implementationStatus,
            finalResult
        } = req.body;

        const allowedStatuses = [
            "Not Started",
            "In Progress",
            "Partially Implemented",
            "Implemented",
            "Not Implemented"
        ];

        if (
            !Number.isInteger(decisionId) ||
            decisionId <= 0 ||
            !implementationStatus
        ) {
            return res.status(400).json({
                message:
                    "Decision ID and implementation status are required."
            });
        }

        if (
            !allowedStatuses.includes(
                implementationStatus
            )
        ) {
            return res.status(400).json({
                message:
                    "Invalid implementation status."
            });
        }

        checkDecisionManager(
            decisionId,
            userId,
            (managerError, decision) => {
                if (managerError) {
                    console.error(
                        "Check decision manager error:",
                        managerError
                    );

                    return res.status(500).json({
                        message:
                            "Decision permission could not be checked."
                    });
                }

                if (!decision) {
                    return res.status(403).json({
                        message:
                            "Only the meeting creator can update this decision."
                    });
                }

                let normalizedFinalResult =
                    null;

                if (
                    typeof finalResult ===
                    "string"
                ) {
                    const trimmedFinalResult =
                        finalResult.trim();

                    if (trimmedFinalResult) {
                        normalizedFinalResult =
                            trimmedFinalResult;
                    }
                }

                const query = `
                    UPDATE Decisions

                    SET
                        ImplementationStatus = ?,
                        FinalResult = ?

                    WHERE Id = ?
                `;

                const values = [
                    implementationStatus,
                    normalizedFinalResult,
                    decisionId
                ];

                sql.query(
                    connectionString,
                    query,
                    values,
                    (error) => {
                        if (error) {
                            console.error(
                                "Update implementation status error:",
                                error
                            );

                            return res.status(500).json({
                                message:
                                    "Decision implementation status could not be updated."
                            });
                        }

                        return res.status(200).json({
                            message:
                                "Decision implementation status updated successfully.",

                            decisionId,

                            implementationStatus,

                            finalResult:
                                normalizedFinalResult
                        });
                    }
                );
            }
        );
    }
);


module.exports = router;