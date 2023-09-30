require("dotenv").config();
const mysql = require("mysql");
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());

const PORT = process.env.PORT;
//Our Database Config
const DB_HOST = process.env.DB_HOST;
const DB_DATABASE = process.env.DB_DATABASE;
const DB_USERNAME = process.env.DB_USERNAME;
const DB_PASSWORD = process.env.DB_PASSWORD;

const db = mysql.createConnection({
    user: DB_USERNAME,
    password: DB_PASSWORD,
    host: DB_HOST,
    database: DB_DATABASE,
});

//Get all threads from the database
app.get("/threads", function (req, res) {
    db.query(
        "SELECT threads.thread_id,threads.title,threads.body,threads.created_at,threads.last_updated,media.url as image FROM threads LEFT JOIN media ON threads.image = media.media_id order by last_updated",
        (error, data) => {
            if (error) {
                return res.json({ status: "ERROR", error });
            }
            const threads = data;
            db.query(
                "select * from replies order by created_at limit 6",
                (error, data) => {
                    if (error) {
                        return res.json({ status: "ERROR", error });
                    }

                    const completed = threads.map((thread) => {
                        return {
                            ...thread,
                            replies: data.filter(
                                (reply) => reply.thread_id === thread.thread_id
                            ),
                        };
                    });

                    return res.json(completed);
                }
            );
        }
    );
});

//Get single threads by id from the database
app.get("/threads/:id", (req, res) => {
    const threadId = parseInt(req.params.id);
    db.query(
        `select * from threads where thread_id=?`,
        [threadId],
        (error, data) => {
            if (error) {
                return res.json({ status: "ERROR", error });
            }
            console.log("getting thread..");
            const thread = data[0];

            db.query(
                "select * from replies where thread_id=? order by created_at",
                [threadId],
                (error, data) => {
                    if (error) {
                        return res.json({ status: "ERROR", error });
                    }
                    console.log("getting replies");

                    res.json({ ...thread, replies: data });
                }
            );
        }
    );
});

//Add new thread to the database
app.post("/threads", function (req, res) {
    let newThread = { ...req.body };

    db.query("INSERT INTO threads SET ?", newThread, (error, result) => {
        if (error) {
            return res.status(500).json({ status: "ERROR", error });
        }

        return res.json({ status: "SUCCESS" });
    });
});

//Post reply
app.post("/threads/:id", function (req, res) {
    let newReply = { ...req.body };

    db.query("INSERT INTO replies SET ?", newReply, (error, result) => {
        if (error) {
            return res.status(500).json({ status: "ERROR", error });
        }

        db.query(
            "update threads set last_updated=? where thread_id=?",
            [newReply.created_at, newReply.thread_id],
            (error, result) => {
                if (error) {
                    return res.status(500).json({ status: "ERROR", error });
                }

                return res.json({ status: "SUCCESS" });
            }
        );
    });
});

app.listen(PORT, function () {
    console.log(`Restful API is running on PORT ${PORT}`);
});
