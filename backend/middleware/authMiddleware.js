require("dotenv").config({ quiet: true });

const jwt = require("jsonwebtoken");


const authMiddleware =
    (req, res, next) => {

        if (!process.env.JWT_SECRET) {
            console.error(
                "JWT_SECRET is not configured."
            );

            return res.status(500).json({
                message:
                    "Authentication configuration error."
            });
        }

        const authHeader =
            req.headers.authorization;

        if (
            !authHeader ||
            !authHeader.startsWith(
                "Bearer "
            )
        ) {
            return res.status(401).json({
                message:
                    "Authentication token is required."
            });
        }

        const token =
            authHeader
                .slice(7)
                .trim();

        if (!token) {
            return res.status(401).json({
                message:
                    "Authentication token is required."
            });
        }

        try {
            const decoded =
                jwt.verify(
                    token,
                    process.env.JWT_SECRET
                );

            if (
                !decoded ||
                !decoded.userId
            ) {
                return res.status(401).json({
                    message:
                        "Invalid authentication token."
                });
            }

            req.user =
                decoded;

            return next();

        } catch (error) {

            if (
                error.name ===
                "TokenExpiredError"
            ) {
                return res.status(401).json({
                    message:
                        "Authentication token has expired."
                });
            }

            if (
                error.name ===
                "JsonWebTokenError"
            ) {
                return res.status(401).json({
                    message:
                        "Invalid authentication token."
                });
            }

            console.error(
                "Token verification error:",
                error
            );

            return res.status(401).json({
                message:
                    "Authentication failed."
            });
        }
    };


module.exports =
    authMiddleware;