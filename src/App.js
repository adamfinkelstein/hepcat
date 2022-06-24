import React, { useState, useEffect } from "react";
import { Container, Stack } from 'react-bootstrap';

import socketIOClient from "socket.io-client";

export default function App() {

  const [socket, setSocket] = useState(null);
  const [welcome, setWelcome] = useState('');
  const [messages, setMessages] = useState([]);
  const [papers, setPapers] = useState([]);
  
  useEffect(() => {
    const endpt = process.env.REACT_APP_SOCKET_ENDPOINT;
    const newSocket = endpt ? socketIOClient(endpt) : socketIOClient();
    setSocket(newSocket);
    return () => newSocket.close();
  }, [setSocket]);
  
  useEffect(() => {

    console.log(socket);

    const receiveWelcome = (data) => {
      console.log('received welcome:');
      console.log(data);
      let user_name = 'Unknown User';
      if (data && 'user_name' in data) {
        user_name = data.user_name;
      }
      setWelcome(user_name);
    };

    const receiveChat = (data) => {
      console.log('received chat:');
      console.log(data);
      // const sender = data.sender; // unused for now
      // const msg = data.message;
      setMessages((oldList) => {
        const newList = [...oldList, data];
        return newList;
      });
    };

    const receivePapers = (data) => {
      console.log('received papers:');
      console.log(data);
      // const messages = data.papers.map( p => p.title );
      setPapers(data.papers);
    };

    if (socket && 'on' in socket) {
      console.log('register welcome and chat broadcast');
      socket.on('welcome', receiveWelcome);
      socket.on('chat_broadcast', receiveChat);
      socket.on('papers', receivePapers);
      // later investigate whether to register on disconnect
      // ... possibly force a page reload which might send to login
    }

    return () => {
      if (socket && 'off' in socket) {
        socket.off('welcome', receiveWelcome);
        socket.off('chat_broadcast', receiveChat);
        socket.off('papers', receivePapers);
      }
    };
  }, [socket]);

  function sendMessage () {
    const txtInput = document.getElementById("chat-input");
    const value = txtInput.value;
    txtInput.value = ''; // clear out the text input field on send
    if (socket && 'emit' in socket) {
      const data = { message: value };
      console.log('sending data:');
      console.log(data);
      socket.emit('chat', data);
    }
    else {
      console.log('socket not connected. cannot send: ' + value)
    }
  }

  function requestPapers () {
    if (socket && 'emit' in socket) {
      console.log('request papers');
      socket.emit('request_papers');
    }
  }

  function handleKeydown(event) {
    if (event.keyCode === 13) { // return key clicks send button
      document.getElementById("chat-btn").click();
    }
  }

  return (
    <Container fluid className="App">
      <Stack direction="vertical">
      Links:
      <ul>
      <li><a href="/upload">Upload</a></li>
      <li><a href="/auth/logout">Logout</a></li>
      </ul>
      <h1 className="header">Flask React Test v5 ({welcome})</h1>
      <input type="text" id="chat-input" onKeyDown={handleKeydown} />
      &nbsp;
      <button id="chat-btn" onClick={sendMessage}>Send</button>
      &nbsp;
      <button id="papers-btn" onClick={requestPapers}>Papers</button>
      <h3>Messages:</h3>
      {
        (messages.length === 0) ? (
          <span>(no messages)</span>
        ) : (
          <ul>
            {
              messages.map( (msg,index) => {
                return(
                  <li key={index.toString()}>{msg.sender + ': ' +msg.message}</li>
                )
              })
            }
          </ul>
        )
      }
      <h3>Papers:</h3>
      {
        (papers.length === 0) ? (
          <span>(no papers)</span>
        ) : (
          <ul>
            {
              papers.map( (p,index) => {
                return(
                  <li key={index.toString()}>{p.sid + ': ' +p.title}</li>
                )
              })
            }
          </ul>
        )
      }
    </Stack>
    </Container>
  );
}
