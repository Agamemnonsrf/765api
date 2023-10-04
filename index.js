require("dotenv").config();
const mysql = require("mysql2");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express(); var jsonParser = bodyParser.json()
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
        `SELECT threads.thread_id,threads.title,threads.body,threads.created_at,threads.last_updated,media.url as image FROM threads LEFT JOIN media ON threads.image = media.media_id where threads.thread_id=? order by last_updated `,
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
app.post("/threads", jsonParser, function (req, res) {
    let newThread = { ...req.body };
    db.query("select post_number from records order by post_number desc limit 1", (error, result) => {
        if (error) {
            return res.status(500).json({ status: "ERROR", error });
        }
        newThread.thread_id = result[0].post_number + 1;
        db.query("INSERT INTO threads SET ?", newThread, (error, result) => {
            if (error) {
                return res.status(500).json({ status: "ERROR", error });
            }

            return res.json({ status: "SUCCESS" });
        });
    })


});

//Post reply
app.post("/replies", jsonParser, function (req, res) {
    let newReply = { ...req.body };
    db.query("select post_number from records order by post_number desc limit 1", (error, result) => {
        if (error) {
            return res.status(500).json({ status: "ERROR", error });
        }

        newReply.reply_id = result[0].post_number + 1;

        db.query(
            "insert into replies set ?", newReply,
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
