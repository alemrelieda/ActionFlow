require("dotenv").config({ quiet: true });

const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const sql = require("msnodesqlv8");

const router = express.Router();

const connectionString =
    `Driver={ODBC Driver 17 for SQL Server};` +
    `Server=${process.env.DB_SERVER},${process.env.DB_PORT};` +
    `Database=${process.env.DB_DATABASE};` +
    `Trusted_Connection=Yes;` +
    `TrustServerCertificate=Yes;`;


/* =========================
   REGISTER
========================= */

router.post(
    "/register",
    async (req, res) => {
        try {
            const fullName =
                typeof req.body.fullName === "string"
                    ? req.body.fullName.trim()
                    : "";

            const email =
                typeof req.body.email === "string"
                    ? req.body.email.trim().toLowerCase()
                    : "";

            const password =
                typeof req.body.password === "string"
                    ? req.body.password
                    : "";

            if (
                !fullName ||
                !email ||
                !password
            ) {
                return res.status(400).json({
                    message:
                        "Full name, email and password are required."
                });
            }

            if (password.length < 8) {
                return res.status(400).json({
                    message:
                        "Password must be at least 8 characters long."
                });
            }

            const checkQuery = `
                SELECT Id
                FROM Users
                WHERE Email = ?
            `;

            sql.query(
                connectionString,
                checkQuery,
                [email],
                async (checkError, existingUsers) => {
                    if (checkError) {
                        console.error(
                            "Check existing user error:",
                            checkError
                        );

                        return res.status(500).json({
                            message:
                                "Registration could not be completed."
                        });
                    }

                    if (
                        existingUsers &&
                        existingUsers.length > 0
                    ) {
                        return res.status(409).json({
                            message:
                                "An account with this email already exists."
                        });
                    }

                    const passwordHash =
                        await bcrypt.hash(
                            password,
                            10
                        );

                    const insertQuery = `
                        INSERT INTO Users (
                            FullName,
                            Email,
                            PasswordHash
                        )
                        VALUES (?, ?, ?)
                    `;

                    sql.query(
                        connectionString,
                        insertQuery,
                        [
                            fullName,
                            email,
                            passwordHash
                        ],
                        (insertError) => {
                            if (insertError) {
                                console.error(
                                    "Register user error:",
                                    insertError
                                );

                                return res.status(500).json({
                                    message:
                                        "Registration failed."
                                });
                            }

                            return res.status(201).json({
                                message:
                                    "User registered successfully."
                            });
                        }
                    );
                }
            );

        } catch (error) {
            console.error(
                "Register error:",
                error
            );

            return res.status(500).json({
                message:
                    "Internal server error."
            });
        }
    }
);


/* =========================
   LOGIN
========================= */

router.post(
    "/login",
    (req, res) => {
        const email =
            typeof req.body.email === "string"
                ? req.body.email.trim().toLowerCase()
                : "";

        const password =
            typeof req.body.password === "string"
                ? req.body.password
                : "";

        if (
            !email ||
            !password
        ) {
            return res.status(400).json({
                message:
                    "Email and password are required."
            });
        }

        if (!process.env.JWT_SECRET) {
            console.error(
                "JWT_SECRET is not configured."
            );

            return res.status(500).json({
                message:
                    "Authentication configuration error."
            });
        }

        const query = `
            SELECT
                Id,
                FullName,
                Email,
                PasswordHash,
                Role

            FROM Users

            WHERE Email = ?
        `;

        sql.query(
            connectionString,
            query,
            [email],
            async (error, users) => {
                if (error) {
                    console.error(
                        "Login query error:",
                        error
                    );

                    return res.status(500).json({
                        message:
                            "Login failed."
                    });
                }

                if (
                    !users ||
                    users.length === 0
                ) {
                    return res.status(401).json({
                        message:
                            "Invalid email or password."
                    });
                }

                const user =
                    users[0];

                try {
                    const passwordMatch =
                        await bcrypt.compare(
                            password,
                            user.PasswordHash
                        );

                    if (!passwordMatch) {
                        return res.status(401).json({
                            message:
                                "Invalid email or password."
                        });
                    }

                    const token =
                        jwt.sign(
                            {
                                userId:
                                    user.Id,

                                role:
                                    user.Role
                            },

                            process.env.JWT_SECRET,

                            {
                                expiresIn:
                                    "8h"
                            }
                        );

                    return res.status(200).json({
                        message:
                            "Login successful.",

                        token,

                        user: {
                            id:
                                user.Id,

                            fullName:
                                user.FullName,

                            email:
                                user.Email,

                            role:
                                user.Role
                        }
                    });

                } catch (compareError) {
                    console.error(
                        "Password comparison error:",
                        compareError
                    );

                    return res.status(500).json({
                        message:
                            "Login failed."
                    });
                }
            }
        );
    }
);


module.exports = router;