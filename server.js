const express = require('express')
const http = require('http')
const { Server } = require('socket.io')

const app = express()
const server = http.createServer(app)
const io = new Server(server)

app.use('/', express.static('public'))

io.on('connection', (socket) => {
  socket.on('join', (roomId) => {
    const selectedRoom = io.sockets.adapter.rooms.get(roomId)
    const numberOfClients = selectedRoom ? selectedRoom.size : 0

    if (numberOfClients === 0) {
      console.log(`Creating room ${roomId} and emitting room_created socket event`)
      socket.join(roomId)
      socket.emit('room_created', roomId)
    } else if (numberOfClients === 1) {
      console.log(`Joining room ${roomId} and emitting room_joined socket event`)
      socket.join(roomId)
      socket.emit('room_joined', roomId)
    } else {
      console.log(`Can't join room ${roomId}, emitting full_room socket event`)
      socket.emit('full_room', roomId)
    }
  })

  // These events are emitted to all the sockets connected to the same room except the sender.
  socket.on('start_call', (roomId) => {
    console.log(`Broadcasting start_call event to peers in room ${roomId}`)
    socket.to(roomId).emit('start_call')
  })

  socket.on('webrtc_offer', (event) => {
    console.log(`Broadcasting webrtc_offer event to peers in room ${event.roomId}`)
    socket.to(event.roomId).emit('webrtc_offer', event.sdp)
  })

  socket.on('webrtc_answer', (event) => {
    console.log(`Broadcasting webrtc_answer event to peers in room ${event.roomId}`)
    socket.to(event.roomId).emit('webrtc_answer', event.sdp)
  })

  socket.on('webrtc_ice_candidate', (event) => {
    console.log(`Broadcasting webrtc_ice_candidate event to peers in room ${event.roomId}`)
    socket.to(event.roomId).emit('webrtc_ice_candidate', event)
  })

  // SOCKET EVENT CALLBACKS =====================================================
socket.on('start_call', async () => {
    console.log('Socket event callback: start_call')
  
    if (isRoomCreator) {
      rtcPeerConnection = new RTCPeerConnection(iceServers)
      addLocalTracks(rtcPeerConnection)
      rtcPeerConnection.ontrack = setRemoteStream
      rtcPeerConnection.onicecandidate = sendIceCandidate
      await createOffer(rtcPeerConnection)
    }
  })
  
  socket.on('webrtc_offer', async (event) => {
    console.log('Socket event callback: webrtc_offer')
  
    if (!isRoomCreator) {
      rtcPeerConnection = new RTCPeerConnection(iceServers)
      addLocalTracks(rtcPeerConnection)
      rtcPeerConnection.ontrack = setRemoteStream
      rtcPeerConnection.onicecandidate = sendIceCandidate
      rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event))
      await createAnswer(rtcPeerConnection)
    }
  })
  
  socket.on('webrtc_answer', (event) => {
    console.log('Socket event callback: webrtc_answer')
  
    rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event))
  })
  
  socket.on('webrtc_ice_candidate', (event) => {
    console.log('Socket event callback: webrtc_ice_candidate')
  
    // ICE candidate configuration.
    const candidate = new RTCIceCandidate({
      sdpMLineIndex: event.label,
      candidate: event.candidate,
    })
    rtcPeerConnection.addIceCandidate(candidate)
  })
  
  // FUNCTIONS ==================================================================
  function joinRoom(room) {
    if (room === '') {
      alert('Please type a room ID')
    } else {
      roomId = room
      socket.emit('join', room)
      showVideoConference()
    }
  }
  
  function showVideoConference() {
    roomSelectionContainer.style.display = 'none'
    videoChatContainer.style.display = 'block'
  }
  
  async function setLocalStream(mediaConstraints) {
    try {
      localStream = await navigator.mediaDevices.getUserMedia(mediaConstraints)
      localVideoComponent.srcObject = localStream
    } catch (error) {
      console.error('Could not get user media', error)
    }
  }
  
  function addLocalTracks(rtcPeerConnection) {
    localStream.getTracks().forEach((track) => {
      rtcPeerConnection.addTrack(track, localStream)
    })
  }
  
  async function createOffer(rtcPeerConnection) {
    try {
      const sessionDescription = await rtcPeerConnection.createOffer()
      rtcPeerConnection.setLocalDescription(sessionDescription)
      
      socket.emit('webrtc_offer', {
        type: 'webrtc_offer',
        sdp: sessionDescription,
        roomId,
      })
    } catch (error) {
      console.error(error)
    }
  }
  
  async function createAnswer(rtcPeerConnection) {
    try {
      const sessionDescription = await rtcPeerConnection.createAnswer()
      rtcPeerConnection.setLocalDescription(sessionDescription)
      
      socket.emit('webrtc_answer', {
        type: 'webrtc_answer',
        sdp: sessionDescription,
        roomId,
      })
    } catch (error) {
      console.error(error)
    }
  }
  
  function setRemoteStream(event) {
    remoteVideoComponent.srcObject = event.streams[0]
    remoteStream = event.stream
  }
  
  function sendIceCandidate(event) {
    if (event.candidate) {
      socket.emit('webrtc_ice_candidate', {
        roomId,
        label: event.candidate.sdpMLineIndex,
        candidate: event.candidate.candidate,
      })
    }
  }
})

// START THE SERVER =================================================================
const port = process.env.PORT || 3000
server.listen(port, () => {
  console.log(`Express server listening on port ${port}`)
})