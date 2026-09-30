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

router.post("/actions/:actionId/comments", authMiddleware, (req, res) => {
    const actionId = Number(req.params.actionId);
    const { commentText } = req.body;

    if (!actionId) {
        return res.status(400).json({
            message: "Valid action ID is required."
        });
    }

    if (!commentText || !commentText.trim()) {
        return res.status(400).json({
            message: "Comment text is required."
        });
    }

    const checkQuery = `
        SELECT Id
        FROM ActionItems
        WHERE Id = ?
    `;

    sql.query(connectionString, checkQuery, [actionId], (checkError, rows) => {
        if (checkError) {
            console.error(checkError);

            return res.status(500).json({
                message: "Action item could not be checked."
            });
        }

        if (!rows || rows.length === 0) {
            return res.status(404).json({
                message: "Action item not found."
            });
        }

        const insertQuery = `
            INSERT INTO Comments (
                ActionItemId,
                UserId,
                CommentText
            )
            VALUES (?, ?, ?)
        `;

        const values = [
            actionId,
            req.user.userId,
            commentText.trim()
        ];

        sql.query(connectionString, insertQuery, values, (insertError) => {
            if (insertError) {
                console.error(insertError);

                return res.status(500).json({
                    message: "Comment could not be added."
                });
            }

            res.status(201).json({
                message: "Comment added successfully."
            });
        });
    });
});

router.get("/actions/:actionId/comments", authMiddleware, (req, res) => {
    const actionId = Number(req.params.actionId);

    if (!actionId) {
        return res.status(400).json({
            message: "Valid action ID is required."
        });
    }

    const query = `
        SELECT
            c.Id,
            c.ActionItemId,
            c.UserId,
            u.FullName AS UserName,
            c.CommentText,
            c.CreatedAt
        FROM Comments c
        INNER JOIN Users u
            ON c.UserId = u.Id
        WHERE c.ActionItemId = ?
        ORDER BY c.CreatedAt ASC
    `;

    sql.query(connectionString, query, [actionId], (error, rows) => {
        if (error) {
            console.error(error);

            return res.status(500).json({
                message: "Comments could not be loaded."
            });
        }

        res.status(200).json({
            actionId,
            comments: rows
        });
    });
});

module.exports = router;