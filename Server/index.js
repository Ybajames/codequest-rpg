//--Server Set up

const express = require('express');
const app = express();
const fs = require('fs');
const serv = (require('http').Server(app));
const playerList = []
app.get('/', function(req, res) {
   res.sendFile('index.html', { root: __dirname + '/../docs' });
    console.log("express Connection");
}
);
app.use('/', express.static(__dirname + '/../docs'));
try {
    serv.listen(5174);
    console.log("Server Started");
}catch(e){
Console.log("Error Starting Server:", e);
}   


const io = require('socket.io')(serv, {
    cors:{
        origin:"http://localhost:5173",
        methods:["GET","POST"]
    },
    pingTimeout: 10000,
    pingInterval:5000,
});

//Put the info needed here.
io.sockets.on('connection', function(socket){
    socket.on('disconnect', function(){
    const index = playerList.findIndex(item => item.Username === socket.username);
    if (index !== -1)
    {
        const username = playerList[index].Username;
        playerList.splice(index,1);
        io.emit('playerLeft', username);
        console.log(username + " disconnected");
    }
});
    socket.on("clientData", function(data) {
            console.log("Received client data:", data);
            //Check if the its the default player name
            if (data.Username == 'Player') return;
            //Search if User was already accounted for
            const index = playerList.findIndex(item => item.Username === data.Username);
            //if user was found update thier positions
            if(index !== -1){
                playerList[index].x = data.x;
                playerList[index].y = data.y;
                playerList[index].z = data.z;
                playerList[index].yaw_y = data.yaw_y;
            }
            //IF user is not found add them to the list.
            else {
                playerList.push(data)
                socket.username = data.Username;
            }
            io.emit("Players", playerList)
        });
})




