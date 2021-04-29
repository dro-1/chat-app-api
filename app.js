require("dotenv").config();
const PORT = process.env.PORT || 3000;
const express = require("express");
const axios = require("axios");
const app = express();
const httpServer = require("http").createServer(app);

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "OPTIONS, GET, POST, PUT, PATCH, DELETE"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

app.post("/chat", async (req, res) => {
  const { user1Id, user2Id } = req.body;
  if (!user1Id || !user2Id) {
    console.log("IDs missing for chat");
    return res.status(400).send({
      status: "Failed",
      message: "Send both IDs to create a chat",
    });
  }
  const body = {
    query: `
    mutation CreateChat($user1: ID, $user2: ID){
      createChat(data:{
        users:{
          connect:[$user1,$user2]
        }
      }){
        _id
        messages{
          data{
            content
            sender{
              _id
            }
          }
        }
        users{
          data{
            _id
            name
            image
          }
        }
      }
    }
    `,
    variables: {
      user1: user1Id,
      user2: user2Id,
    },
  };
  try {
    const response = await axios.post(
      "https://graphql.fauna.com/graphql",
      body,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.FGU_SECRET}`,
        },
      }
    );
    console.log(response.data);
    io.emit("newChat", response.data.data.createChat);
    res.send({
      status: "Successful",
      message: "Chat Saved Successfully",
    });
  } catch (e) {
    console.log(e);
  }
});

app.post("/message", async (req, res) => {
  console.log(req.url);
  const { message, chatID } = req.body;
  const body = {
    query: `
    mutation CreateMessage($chatID: ID, $senderID: ID, $content: String!){
      createMessage(data:{
       chat:{
         connect: $chatID 
       }
       content: $content
       sender: {
         connect: $senderID
       }
     }){
       content
       _ts
       sender{
         name
         _id
       }
     }
   }
    `,
    variables: {
      chatID,
      senderID: message.senderID,
      content: message.content,
    },
  };
  try {
    const response = await axios.post(
      "https://graphql.fauna.com/graphql",
      body,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.FGU_SECRET}`,
        },
      }
    );
    console.log(response.data);
    console.log(chatID);
    io.sockets.in(chatID).emit("newMessage", response.data.data.createMessage);
    res.send({
      status: "Successful",
      message: "Received",
    });
  } catch (e) {
    console.log(e);
  }
});
const io = require("socket.io")(httpServer, {
  cors: {
    origin: "*",
  },
});
io.on("connection", (socket) => {
  const { chatId } = socket.handshake.query;
  socket.join(chatId);
  console.log(`Connected to ID ${socket.id}`);
});

httpServer.listen(PORT, () => {
  console.log(`Server Started on Port ${PORT}`);
});
