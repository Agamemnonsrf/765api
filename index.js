require("dotenv").config();
const mysql = require("mysql2");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const multer = require("multer");

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







//Get preview threads for a board
app.get("/thread-previews/:board", function (req, res) {
    db.query(
        `SELECT
        t.thread_id,
        t.title,
        COUNT(r.reply_id) AS reply_count
    FROM
        threads t
    LEFT JOIN
        replies r ON t.thread_id = r.thread_id
    WHERE
        t.board = ?
    GROUP BY
        t.thread_id, t.title
    ORDER BY
        MAX(t.last_updated) DESC
    `,
        [req.params.board],
        (error, data) => {
            if (error) {
                return res.json({ status: "ERROR", error });
            }

            return res.json(data);
        }
    );
});



//Get all threads from the database for a board
app.get("/:board/threads", function (req, res) {
    db.query(
        "select * from threads where board=? order by last_updated desc", [req.params.board],
        (error, data) => {
            if (error) {
                return res.json({ status: "ERROR", error });
            }
            const threads = data;

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
        `select * from threads where threads.thread_id=? order by last_updated `,
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


app.post("/record-media", jsonParser, function (req, res) {
    let newMedia = { ...req.body };
    console.log(newMedia)
    db.query(
        "INSERT INTO media SET ?",
        newMedia,
        (error, result) => {
            if (error) {
                return res.status(500).json({ status: "ERROR", error });
            }

            return res.json({ status: "SUCCESS", newMedia });
        }
    );
})


// Set up multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "media-storage/"); // Set the destination folder for uploaded files
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname); // Set the filename for uploaded files
    },
});

// Create multer instance with the storage configuration
const upload = multer({ storage: storage });
app.post("/upload-media", upload.single("file"), function (req, res) {
    const file = req.file; // Get the uploaded file object
    if (!file) {
        return res.status(400).json({ status: "ERROR", error: "No file uploaded" });
    }
    return res.json({ status: "SUCCESS", url: file.filename });
});

app.get("/media/:id", function (req, res) {
    db.query("select * from media where media_id=?", [req.params.id], (error, result) => {
        if (error) {
            return res.status(500).json({ status: "ERROR", error });
        } return res.sendFile(__dirname + "/media-storage/" + req.params.id + "-" + result[0].file_name);
    })

});

app.listen(PORT, function () {
    console.log(`Restful API is running on PORT ${PORT}`);
});
