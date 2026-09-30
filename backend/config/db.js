require("dotenv").config();

const sql = require("msnodesqlv8");

const connectionString =
    `Driver={ODBC Driver 17 for SQL Server};` +
    `Server=${process.env.DB_SERVER},${process.env.DB_PORT};` +
    `Database=${process.env.DB_DATABASE};` +
    `Trusted_Connection=Yes;` +
    `TrustServerCertificate=Yes;`;

const connectDB = () => {
    return new Promise((resolve, reject) => {
        sql.query(connectionString, "SELECT 1 AS Test", (error) => {
            if (error) {
                console.error("SQL Server connection failed:", error.message);
                reject(error);
                return;
            }

            console.log("SQL Server connected successfully.");
            resolve();
        });
    });
};

module.exports = connectDB;