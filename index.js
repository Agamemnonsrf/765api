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




const date = new Date();
console.log(date)
console.log(date.toLocaleString())




//Get all threads from the database
app.get("/threads", function (req, res) {
    db.query(
        "SELECT threads.thread_id,threads.title,threads.body,threads.created_at,threads.last_updated,media.url as image FROM threads LEFT JOIN media ON threads.image = media.media_id order by last_updated desc",
        (error, data) => {
            if (error) {
                return res.json({ status: "ERROR", error });
            }
            const threads = data;
            //I somehow must only get 6 replies for every thread, how?





            db.query(
                "select * from replies order by created_at",
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

//get a single reply by id
app.get("/replies/:id", (req, res) => {
    const replyId = parseInt(req.params.id);
    db.query(
        `SELECT * from replies where reply_id=?`,
        [replyId],
        (error, data) => {
            if (error) {
                return res.json({ status: "ERROR", error });
            }
            const reply = data[0];

            return res.json(reply);
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
    db.query("select max(post_number) from records", (error, result) => {
        if (error) {
            return res.status(500).json({ status: "ERROR", error });
        }
        newThread.thread_id = result[0]['max(post_number)'] + 1;
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
    db.query("select max(post_number) from records", (error, result) => {
        if (error) {
            return res.status(500).json({ status: "ERROR", error });
        }

        newReply.reply_id = result[0]['max(post_number)'] + 1;
        console.log(newReply)
        db.query(
            "insert into replies set content=?, replying_to=?, thread_id=?, reply_id=?, created_at=convert_tz(?,'+00:00', '+00:00')", [newReply.content, newReply.replying_to, newReply.thread_id, newReply.reply_id, newReply.created_at],
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
