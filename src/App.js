import React, { useEffect, useRef, useState } from "react";
import "./App.css";
import axios from "axios";

import * as Chime from "amazon-chime-sdk-js";

function App() {
    const [meetingResponse, setMeetingResponse] = useState();

    const videoElements = useRef([]);

    // index-tileId pairs
    const indexMap = {};

    const acquireVideoElement = (tileId) => {
        // Return the same video element if already bound.
        for (let i = 0; i < 25; i += 1) {
            if (indexMap[i] === tileId) {
                return videoElements.current[i];
            }
        }
        // Return the next available video element.
        for (let i = 0; i < 25; i += 1) {
            if (!indexMap.hasOwnProperty(i)) {
                indexMap[i] = tileId;
                return videoElements.current[i];
            }
        }
        throw new Error("no video element is available");
    };

    const releaseVideoElement = (tileId) => {
        for (let i = 0; i < 25; i += 1) {
            if (indexMap[i] === tileId) {
                delete indexMap[i];
                return;
            }
        }
    };

    const createMeeting = async () => {
        const response = await axios.post("http://localhost:5000/meetings");
        setMeetingResponse(response.data.Meeting);
    };

    const joinVideoCall = async () => {
        const response = await axios.post("http://localhost:5000/attendees", { meetingId: meetingResponse.MeetingId });
        setupMeeting(response.data.Attendee);
    };

    const setupMeeting = async (attendeeResponse) => {
        const logger = new Chime.ConsoleLogger("ChimeMeetingLogs", Chime.LogLevel.INFO);
        const deviceController = new Chime.DefaultDeviceController(logger);
        const configuration = new Chime.MeetingSessionConfiguration(meetingResponse, attendeeResponse);
        const meetingSession = new Chime.DefaultMeetingSession(configuration, logger, deviceController);

        const observer = {
            audioVideoDidStart: () => {
                meetingSession.audioVideo.startLocalVideoTile();
            },
            videoTileDidUpdate: (tileState) => {
                meetingSession.audioVideo.bindVideoElement(tileState.tileId, acquireVideoElement(tileState.tileId));
            },
            videoTileWasRemoved: (tileId) => {
                releaseVideoElement(tileId);
            },
        };

        meetingSession.audioVideo.addObserver(observer);
        const firstVideoDeviceId = (await meetingSession.audioVideo.listVideoInputDevices())[0].deviceId;
        await meetingSession.audioVideo.chooseVideoInputDevice(firstVideoDeviceId);
        meetingSession.audioVideo.start();
    };

    return (
        <div className="App">
            <div className="video-conatiner">
                {[...Array(25).keys()].map((val, i) => (
                    <video key={i} className="video" ref={(el) => (videoElements.current[i] = el)}></video>
                ))}
            </div>
            <div className="controller">
                <div>
                    <button onClick={createMeeting}>미팅생성</button>
                    {meetingResponse && <textarea rows="20">{JSON.stringify(meetingResponse)}</textarea>}
                </div>
                <button disabled={!meetingResponse} onClick={joinVideoCall}>
                    미팅참여
                </button>
            </div>
        </div>
    );
}

export default App;
