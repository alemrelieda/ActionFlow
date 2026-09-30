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
   CHECK DECISION MANAGER

   Only meeting creator
========================= */

function checkDecisionManager(
    decisionId,
    userId,
    callback
) {
    const query = `
        SELECT
            d.Id AS DecisionId,
            d.MeetingId,
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
   CHECK RESPONSIBLE USER

   Responsible person must
   belong to the meeting
========================= */

function checkResponsibleUser(
    decisionId,
    responsibleUserId,
    callback
) {
    const query = `
        SELECT
            d.Id AS DecisionId,
            d.MeetingId,
            mp.UserId

        FROM Decisions d

        INNER JOIN MeetingParticipants mp
            ON mp.MeetingId = d.MeetingId

        WHERE
            d.Id = ?
            AND mp.UserId = ?
    `;

    sql.query(
        connectionString,
        query,
        [
            decisionId,
            responsibleUserId
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
   CHECK ACTION ACCESS

   Can VIEW:
   - meeting creator
   - meeting participant
   - responsible person
========================= */

function checkActionAccess(
    actionId,
    userId,
    callback
) {
    const query = `
        SELECT
            a.Id,
            a.DecisionId,
            a.ResponsibleUserId,
            a.Status,

            d.MeetingId,

            m.CreatedBy AS MeetingCreatedBy

        FROM ActionItems a

        INNER JOIN Decisions d
            ON a.DecisionId = d.Id

        INNER JOIN Meetings m
            ON d.MeetingId = m.Id

        WHERE
            a.Id = ?
            AND (
                m.CreatedBy = ?

                OR a.ResponsibleUserId = ?

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
            actionId,
            userId,
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
   CHECK ACTION EDITOR

   Can UPDATE:
   - meeting creator
   - responsible person
========================= */

function checkActionEditor(
    actionId,
    userId,
    callback
) {
    const query = `
        SELECT
            a.Id,
            a.DecisionId,
            a.ResponsibleUserId,
            a.Status,

            d.MeetingId,

            m.CreatedBy AS MeetingCreatedBy

        FROM ActionItems a

        INNER JOIN Decisions d
            ON a.DecisionId = d.Id

        INNER JOIN Meetings m
            ON d.MeetingId = m.Id

        WHERE
            a.Id = ?
            AND (
                m.CreatedBy = ?
                OR a.ResponsibleUserId = ?
            )
    `;

    sql.query(
        connectionString,
        query,
        [
            actionId,
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
   CHECK ACTION MANAGER

   Can DELETE:
   - meeting creator only
========================= */

function checkActionManager(
    actionId,
    userId,
    callback
) {
    const query = `
        SELECT
            a.Id,
            a.DecisionId,

            d.MeetingId,

            m.CreatedBy AS MeetingCreatedBy

        FROM ActionItems a

        INNER JOIN Decisions d
            ON a.DecisionId = d.Id

        INNER JOIN Meetings m
            ON d.MeetingId = m.Id

        WHERE
            a.Id = ?
            AND m.CreatedBy = ?
    `;

    sql.query(
        connectionString,
        query,
        [
            actionId,
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
   CREATE ACTION

   Only meeting creator
========================= */

router.post(
    "/:decisionId/actions",
    authMiddleware,
    (req, res) => {
        const decisionId =
            Number(req.params.decisionId);

        const currentUserId =
            Number(req.user.userId);

        const {
            title,
            description,
            responsibleUserId,
            priority,
            startDate,
            deadline
        } = req.body;

        const responsibleId =
            Number(responsibleUserId);

        if (
            !Number.isInteger(decisionId) ||
            decisionId <= 0 ||
            !title ||
            !String(title).trim() ||
            !Number.isInteger(responsibleId) ||
            responsibleId <= 0 ||
            !deadline
        ) {
            return res.status(400).json({
                message:
                    "Decision ID, title, responsible person and deadline are required."
            });
        }

        checkDecisionManager(
            decisionId,
            currentUserId,
            (managerError, decision) => {
                if (managerError) {
                    console.error(
                        "Check decision manager error:",
                        managerError
                    );

                    return res.status(500).json({
                        message:
                            "Action permission could not be checked."
                    });
                }

                if (!decision) {
                    return res.status(403).json({
                        message:
                            "Only the meeting creator can create actions."
                    });
                }

                checkResponsibleUser(
                    decisionId,
                    responsibleId,
                    (
                        responsibleError,
                        responsibleUser
                    ) => {
                        if (responsibleError) {
                            console.error(
                                "Check responsible user error:",
                                responsibleError
                            );

                            return res.status(500).json({
                                message:
                                    "Responsible person could not be checked."
                            });
                        }

                        if (!responsibleUser) {
                            return res.status(400).json({
                                message:
                                    "Responsible person must be a participant of this meeting."
                            });
                        }

                        const allowedPriorities = [
                            "Low",
                            "Medium",
                            "High",
                            "Critical"
                        ];

                        const normalizedPriority =
                            allowedPriorities.includes(
                                priority
                            )
                                ? priority
                                : "Medium";

                        const query = `
                            INSERT INTO ActionItems (
                                DecisionId,
                                Title,
                                Description,
                                ResponsibleUserId,
                                Priority,
                                StartDate,
                                Deadline,
                                CreatedBy
                            )
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        `;

                        const values = [
                            decisionId,

                            String(title).trim(),

                            description &&
                            String(description).trim()
                                ? String(description).trim()
                                : null,

                            responsibleId,

                            normalizedPriority,

                            startDate || null,

                            deadline,

                            currentUserId
                        ];

                        sql.query(
                            connectionString,
                            query,
                            values,
                            (error) => {
                                if (error) {
                                    console.error(
                                        "Create action error:",
                                        error
                                    );

                                    return res
                                        .status(500)
                                        .json({
                                            message:
                                                "Action item could not be created."
                                        });
                                }

                                return res
                                    .status(201)
                                    .json({
                                        message:
                                            "Action item created successfully."
                                    });
                            }
                        );
                    }
                );
            }
        );
    }
);


/* =========================
   GET AUTHORIZED ACTIONS
========================= */

router.get(
    "/actions",
    authMiddleware,
    (req, res) => {
        const userId =
            Number(req.user.userId);

        const {
            search,
            status,
            priority,
            responsibleUserId,
            overdue,
            sortBy = "CreatedAt",
            sortOrder = "DESC"
        } = req.query;

        const allowedSortColumns = [
            "Title",
            "Priority",
            "Status",
            "StartDate",
            "Deadline",
            "Progress",
            "CreatedAt",
            "UpdatedAt"
        ];

        const allowedSortOrders = [
            "ASC",
            "DESC"
        ];

        const safeSortBy =
            allowedSortColumns.includes(
                sortBy
            )
                ? sortBy
                : "CreatedAt";

        const requestedSortOrder =
            String(
                sortOrder
            ).toUpperCase();

        const safeSortOrder =
            allowedSortOrders.includes(
                requestedSortOrder
            )
                ? requestedSortOrder
                : "DESC";

        let query = `
            SELECT DISTINCT
                a.Id,
                a.DecisionId,
                a.Title,
                a.Description,
                a.ResponsibleUserId,

                u.FullName
                    AS ResponsiblePerson,

                a.Priority,
                a.Status,
                a.StartDate,
                a.Deadline,
                a.Progress,
                a.Result,
                a.CreatedBy,
                a.CreatedAt,
                a.UpdatedAt,

                CASE
                    WHEN
                        a.Deadline <
                        CAST(GETDATE() AS DATE)

                        AND a.Status NOT IN (
                            'Completed',
                            'Cancelled'
                        )

                    THEN 1
                    ELSE 0
                END AS IsOverdue

            FROM ActionItems a

            INNER JOIN Users u
                ON a.ResponsibleUserId = u.Id

            INNER JOIN Decisions d
                ON a.DecisionId = d.Id

            INNER JOIN Meetings m
                ON d.MeetingId = m.Id

            WHERE
                (
                    m.CreatedBy = ?

                    OR a.ResponsibleUserId = ?

                    OR EXISTS (
                        SELECT 1

                        FROM MeetingParticipants mp

                        WHERE
                            mp.MeetingId = m.Id
                            AND mp.UserId = ?
                    )
                )
        `;

        const values = [
            userId,
            userId,
            userId
        ];

        if (
            search &&
            String(search).trim()
        ) {
            query += `
                AND (
                    a.Title LIKE ?
                    OR a.Description LIKE ?
                )
            `;

            const searchValue =
                `%${String(search).trim()}%`;

            values.push(
                searchValue,
                searchValue
            );
        }

        if (status) {
            query += `
                AND a.Status = ?
            `;

            values.push(status);
        }

        if (priority) {
            query += `
                AND a.Priority = ?
            `;

            values.push(priority);
        }

        if (responsibleUserId) {
            const responsibleId =
                Number(responsibleUserId);

            if (
                Number.isInteger(
                    responsibleId
                ) &&
                responsibleId > 0
            ) {
                query += `
                    AND a.ResponsibleUserId = ?
                `;

                values.push(
                    responsibleId
                );
            }
        }

        if (overdue === "true") {
            query += `
                AND
                    a.Deadline <
                    CAST(GETDATE() AS DATE)

                AND
                    a.Status NOT IN (
                        'Completed',
                        'Cancelled'
                    )
            `;
        }

        query += `
            ORDER BY
                a.${safeSortBy}
                ${safeSortOrder}
        `;

        sql.query(
            connectionString,
            query,
            values,
            (error, rows) => {
                if (error) {
                    console.error(
                        "Load authorized actions error:",
                        error
                    );

                    return res.status(500).json({
                        message:
                            "Action items could not be loaded."
                    });
                }

                const actions =
                    (rows || []).map(
                        (action) => ({
                            ...action,

                            IsOverdue:
                                action.IsOverdue ===
                                1
                        })
                    );

                return res.status(200).json({
                    count:
                        actions.length,

                    actions
                });
            }
        );
    }
);


/* =========================
   AUTHORIZED KANBAN
========================= */

router.get(
    "/actions/kanban",
    authMiddleware,
    (req, res) => {
        const userId =
            Number(req.user.userId);

        const query = `
            SELECT DISTINCT
                a.Id,
                a.DecisionId,
                a.Title,
                a.Description,
                a.ResponsibleUserId,

                u.FullName
                    AS ResponsiblePerson,

                a.Priority,
                a.Status,
                a.StartDate,
                a.Deadline,
                a.Progress,
                a.Result,

                CASE
                    WHEN
                        a.Deadline <
                        CAST(GETDATE() AS DATE)

                        AND
                        a.Status NOT IN (
                            'Completed',
                            'Cancelled'
                        )

                    THEN 1
                    ELSE 0

                END AS IsOverdue

            FROM ActionItems a

            INNER JOIN Users u
                ON a.ResponsibleUserId = u.Id

            INNER JOIN Decisions d
                ON a.DecisionId = d.Id

            INNER JOIN Meetings m
                ON d.MeetingId = m.Id

            WHERE
                a.Status IN (
                    'To Do',
                    'In Progress',
                    'Blocked',
                    'Completed'
                )

                AND (
                    m.CreatedBy = ?

                    OR a.ResponsibleUserId = ?

                    OR EXISTS (
                        SELECT 1

                        FROM MeetingParticipants mp

                        WHERE
                            mp.MeetingId = m.Id
                            AND mp.UserId = ?
                    )
                )

            ORDER BY
                a.Deadline ASC
        `;

        sql.query(
            connectionString,
            query,
            [
                userId,
                userId,
                userId
            ],
            (error, rows) => {
                if (error) {
                    console.error(
                        "Kanban error:",
                        error
                    );

                    return res.status(500).json({
                        message:
                            "Kanban data could not be loaded."
                    });
                }

                const actions =
                    (rows || []).map(
                        (action) => ({
                            ...action,

                            IsOverdue:
                                action.IsOverdue ===
                                1
                        })
                    );

                const columns = {
                    toDo:
                        actions.filter(
                            (action) =>
                                action.Status ===
                                "To Do"
                        ),

                    inProgress:
                        actions.filter(
                            (action) =>
                                action.Status ===
                                "In Progress"
                        ),

                    blocked:
                        actions.filter(
                            (action) =>
                                action.Status ===
                                "Blocked"
                        ),

                    completed:
                        actions.filter(
                            (action) =>
                                action.Status ===
                                "Completed"
                        )
                };

                return res.status(200).json({
                    totalActions:
                        actions.length,

                    columns
                });
            }
        );
    }
);


/* =========================
   UPDATE ACTION STATUS

   Meeting creator OR
   responsible person
========================= */

router.patch(
    "/actions/:actionId/status",
    authMiddleware,
    (req, res) => {
        const actionId =
            Number(req.params.actionId);

        const userId =
            Number(req.user.userId);

        const { status } =
            req.body;

        const allowedStatuses = [
            "To Do",
            "In Progress",
            "Blocked",
            "Completed",
            "Cancelled"
        ];

        if (
            !Number.isInteger(actionId) ||
            actionId <= 0 ||
            !status
        ) {
            return res.status(400).json({
                message:
                    "Action ID and status are required."
            });
        }

        if (
            !allowedStatuses.includes(
                status
            )
        ) {
            return res.status(400).json({
                message:
                    "Invalid action status."
            });
        }

        checkActionEditor(
            actionId,
            userId,
            (accessError, action) => {
                if (accessError) {
                    console.error(
                        "Check action editor error:",
                        accessError
                    );

                    return res.status(500).json({
                        message:
                            "Action permission could not be checked."
                    });
                }

                if (!action) {
                    return res.status(403).json({
                        message:
                            "You do not have permission to update this action."
                    });
                }

                const oldStatus =
                    action.Status;

                if (
                    oldStatus === status
                ) {
                    return res.status(200).json({
                        message:
                            "Action status is already up to date.",

                        oldStatus,

                        newStatus:
                            status
                    });
                }

                const updateQuery = `
                    UPDATE ActionItems

                    SET
                        Status = ?,
                        UpdatedAt = GETDATE()

                    WHERE Id = ?
                `;

                sql.query(
                    connectionString,
                    updateQuery,
                    [
                        status,
                        actionId
                    ],
                    (updateError) => {
                        if (updateError) {
                            console.error(
                                "Update action status error:",
                                updateError
                            );

                            return res.status(500).json({
                                message:
                                    "Action status could not be updated."
                            });
                        }

                        /*
                            History ayrı query.

                            Daha önce backend çökmesini
                            engellemek için bu yapıyı
                            kullanmıştık.
                        */

                        const historyQuery = `
                            INSERT INTO ActionStatusHistory (
                                ActionItemId,
                                OldStatus,
                                NewStatus,
                                ChangedBy
                            )

                            VALUES (?, ?, ?, ?)
                        `;

                        const historyValues = [
                            actionId,
                            oldStatus,
                            status,
                            userId
                        ];

                        sql.query(
                            connectionString,
                            historyQuery,
                            historyValues,
                            (historyError) => {
                                if (historyError) {
                                    console.error(
                                        "Insert action history error:",
                                        historyError
                                    );

                                    return res.status(200).json({
                                        message:
                                            "Action status updated, but history could not be saved.",

                                        oldStatus,

                                        newStatus:
                                            status
                                    });
                                }

                                return res.status(200).json({
                                    message:
                                        "Action status updated successfully.",

                                    oldStatus,

                                    newStatus:
                                        status
                                });
                            }
                        );
                    }
                );
            }
        );
    }
);


/* =========================
   UPDATE PROGRESS

   Meeting creator OR
   responsible person
========================= */

router.patch(
    "/actions/:actionId/progress",
    authMiddleware,
    (req, res) => {
        const actionId =
            Number(req.params.actionId);

        const userId =
            Number(req.user.userId);

        const progress =
            Number(req.body.progress);

        if (
            !Number.isInteger(actionId) ||
            actionId <= 0
        ) {
            return res.status(400).json({
                message:
                    "Valid action ID is required."
            });
        }

        if (
            !Number.isInteger(progress) ||
            progress < 0 ||
            progress > 100
        ) {
            return res.status(400).json({
                message:
                    "Progress must be an integer between 0 and 100."
            });
        }

        checkActionEditor(
            actionId,
            userId,
            (accessError, action) => {
                if (accessError) {
                    console.error(
                        "Check action editor error:",
                        accessError
                    );

                    return res.status(500).json({
                        message:
                            "Action permission could not be checked."
                    });
                }

                if (!action) {
                    return res.status(403).json({
                        message:
                            "You do not have permission to update this action."
                    });
                }

                const updateQuery = `
                    UPDATE ActionItems

                    SET
                        Progress = ?,
                        UpdatedAt = GETDATE()

                    WHERE Id = ?
                `;

                sql.query(
                    connectionString,
                    updateQuery,
                    [
                        progress,
                        actionId
                    ],
                    (updateError) => {
                        if (updateError) {
                            console.error(
                                "Update progress error:",
                                updateError
                            );

                            return res.status(500).json({
                                message:
                                    "Action progress could not be updated."
                            });
                        }

                        return res.status(200).json({
                            message:
                                "Action progress updated successfully.",

                            actionId,

                            progress
                        });
                    }
                );
            }
        );
    }
);


/* =========================
   SAVE RESULT

   Meeting creator OR
   responsible person
========================= */

router.patch(
    "/actions/:actionId/result",
    authMiddleware,
    (req, res) => {
        const actionId =
            Number(req.params.actionId);

        const userId =
            Number(req.user.userId);

        const result =
            typeof req.body?.result ===
            "string"
                ? req.body.result.trim()
                : "";

        if (
            !Number.isInteger(actionId) ||
            actionId <= 0
        ) {
            return res.status(400).json({
                message:
                    "Valid action ID is required."
            });
        }

        if (!result) {
            return res.status(400).json({
                message:
                    "Result is required."
            });
        }

        checkActionEditor(
            actionId,
            userId,
            (accessError, action) => {
                if (accessError) {
                    console.error(
                        "Check action editor error:",
                        accessError
                    );

                    return res.status(500).json({
                        message:
                            "Action permission could not be checked."
                    });
                }

                if (!action) {
                    return res.status(403).json({
                        message:
                            "You do not have permission to update this action."
                    });
                }

                const updateQuery = `
                    UPDATE ActionItems

                    SET
                        [Result] = ?,
                        UpdatedAt = GETDATE()

                    WHERE Id = ?
                `;

                sql.query(
                    connectionString,
                    updateQuery,
                    [
                        result,
                        actionId
                    ],
                    (updateError) => {
                        if (updateError) {
                            console.error(
                                "Save result error:",
                                updateError
                            );

                            return res.status(500).json({
                                message:
                                    "Action result could not be updated."
                            });
                        }

                        return res.status(200).json({
                            message:
                                "Action result updated successfully.",

                            actionId,

                            result
                        });
                    }
                );
            }
        );
    }
);


/* =========================
   STATUS HISTORY

   Meeting creator,
   participant,
   responsible person
========================= */

router.get(
    "/actions/:actionId/history",
    authMiddleware,
    (req, res) => {
        const actionId =
            Number(req.params.actionId);

        const userId =
            Number(req.user.userId);

        if (
            !Number.isInteger(actionId) ||
            actionId <= 0
        ) {
            return res.status(400).json({
                message:
                    "Valid action ID is required."
            });
        }

        checkActionAccess(
            actionId,
            userId,
            (accessError, action) => {
                if (accessError) {
                    console.error(
                        "Check action access error:",
                        accessError
                    );

                    return res.status(500).json({
                        message:
                            "Action permission could not be checked."
                    });
                }

                if (!action) {
                    return res.status(403).json({
                        message:
                            "You do not have permission to view this action."
                    });
                }

                const query = `
                    SELECT
                        h.Id,
                        h.ActionItemId,
                        h.OldStatus,
                        h.NewStatus,
                        h.ChangedAt,
                        h.ChangedBy,

                        u.FullName
                            AS ChangedByName

                    FROM ActionStatusHistory h

                    INNER JOIN Users u
                        ON h.ChangedBy = u.Id

                    WHERE
                        h.ActionItemId = ?

                    ORDER BY
                        h.ChangedAt ASC
                `;

                sql.query(
                    connectionString,
                    query,
                    [actionId],
                    (error, rows) => {
                        if (error) {
                            console.error(
                                "Load history error:",
                                error
                            );

                            return res.status(500).json({
                                message:
                                    "Status history could not be loaded."
                            });
                        }

                        return res.status(200).json({
                            actionId,

                            history:
                                rows || []
                        });
                    }
                );
            }
        );
    }
);


/* =========================
   GET SINGLE ACTION

   Meeting creator,
   participant,
   responsible person
========================= */

router.get(
    "/actions/:actionId",
    authMiddleware,
    (req, res) => {
        const actionId =
            Number(req.params.actionId);

        const userId =
            Number(req.user.userId);

        if (
            !Number.isInteger(actionId) ||
            actionId <= 0
        ) {
            return res.status(400).json({
                message:
                    "Valid action ID is required."
            });
        }

        checkActionAccess(
            actionId,
            userId,
            (accessError, access) => {
                if (accessError) {
                    console.error(
                        "Check action access error:",
                        accessError
                    );

                    return res.status(500).json({
                        message:
                            "Action permission could not be checked."
                    });
                }

                if (!access) {
                    return res.status(403).json({
                        message:
                            "You do not have permission to view this action."
                    });
                }

                const query = `
                    SELECT
                        a.Id,
                        a.DecisionId,
                        a.Title,
                        a.Description,
                        a.ResponsibleUserId,

                        u.FullName
                            AS ResponsiblePerson,

                        a.Priority,
                        a.Status,
                        a.StartDate,
                        a.Deadline,
                        a.Progress,
                        a.Result,
                        a.CreatedBy,
                        a.CreatedAt,
                        a.UpdatedAt,

                        CASE
                            WHEN
                                a.Deadline <
                                CAST(GETDATE() AS DATE)

                                AND
                                a.Status NOT IN (
                                    'Completed',
                                    'Cancelled'
                                )

                            THEN 1
                            ELSE 0

                        END AS IsOverdue

                    FROM ActionItems a

                    INNER JOIN Users u
                        ON a.ResponsibleUserId = u.Id

                    WHERE
                        a.Id = ?
                `;

                sql.query(
                    connectionString,
                    query,
                    [actionId],
                    (error, rows) => {
                        if (error) {
                            console.error(
                                "Load single action error:",
                                error
                            );

                            return res.status(500).json({
                                message:
                                    "Action item could not be loaded."
                            });
                        }

                        if (
                            !rows ||
                            rows.length === 0
                        ) {
                            return res.status(404).json({
                                message:
                                    "Action item not found."
                            });
                        }

                        const action =
                            rows[0];

                        action.IsOverdue =
                            action.IsOverdue === 1;

                        return res
                            .status(200)
                            .json(action);
                    }
                );
            }
        );
    }
);


/* =========================
   DELETE ACTION

   Meeting creator only
========================= */

router.delete(
    "/actions/:actionId",
    authMiddleware,
    (req, res) => {
        const actionId =
            Number(req.params.actionId);

        const userId =
            Number(req.user.userId);

        if (
            !Number.isInteger(actionId) ||
            actionId <= 0
        ) {
            return res.status(400).json({
                message:
                    "Valid action ID is required."
            });
        }

        checkActionManager(
            actionId,
            userId,
            (accessError, action) => {
                if (accessError) {
                    console.error(
                        "Check action manager error:",
                        accessError
                    );

                    return res.status(500).json({
                        message:
                            "Action permission could not be checked."
                    });
                }

                if (!action) {
                    return res.status(403).json({
                        message:
                            "Only the meeting creator can delete this action."
                    });
                }

                /*
                    Önce History siliniyor.

                    Böylece ActionStatusHistory
                    foreign key varsa Action
                    silme işlemi engellenmez.
                */

                const deleteHistoryQuery = `
                    DELETE FROM ActionStatusHistory
                    WHERE ActionItemId = ?
                `;

                sql.query(
                    connectionString,
                    deleteHistoryQuery,
                    [actionId],
                    (historyError) => {
                        if (historyError) {
                            console.error(
                                "Delete action history error:",
                                historyError
                            );

                            return res.status(500).json({
                                message:
                                    "Action history could not be deleted."
                            });
                        }

                        const deleteActionQuery = `
                            DELETE FROM ActionItems
                            WHERE Id = ?
                        `;

                        sql.query(
                            connectionString,
                            deleteActionQuery,
                            [actionId],
                            (deleteError) => {
                                if (deleteError) {
                                    console.error(
                                        "Delete action error:",
                                        deleteError
                                    );

                                    return res.status(500).json({
                                        message:
                                            "Action item could not be deleted."
                                    });
                                }

                                return res.status(200).json({
                                    message:
                                        "Action deleted successfully.",

                                    actionId
                                });
                            }
                        );
                    }
                );
            }
        );
    }
);


module.exports = router;