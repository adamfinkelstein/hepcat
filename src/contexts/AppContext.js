import React, {useState, useContext, useEffect, useCallback} from 'react'
import socketIOClient from "socket.io-client";
import {useFlasher} from './FlasherContext'
import smartquotes from 'smartquotes';
import moment from 'moment'

var CryptoJS = require("crypto-js");

const AppGlobalsContext = React.createContext() 

function decryptMsgUsingKey(msg, keyStr) {
    const key = CryptoJS.enc.Utf8.parse(keyStr)
    const decrypted = CryptoJS.AES.decrypt(msg, key, {mode:CryptoJS.mode.ECB})
    const utf8 = decrypted.toString(CryptoJS.enc.Utf8)
    // console.log('\n\nencrypted message: ' + msg)
    // console.log('decrypted message: ' + utf8)
    return utf8
}

function getTimeInHiddenMessage(msg) {
    const regexp = /===.*===/g
    const matches = msg.match(regexp)
    if (!matches) return msg
    for (const match of matches) {
        const timeStr = match.replace(/===/g,'')
        const utcThen = moment(timeStr).format('ddd LT')
        msg = msg.replace(match, utcThen)
    }
    return msg
}

export function useAppGlobals(){
    return useContext(AppGlobalsContext)
}

export default function AppContext({children}){
    
    const [user, setUser] = useState(null)
    const [isAdmin, setIsAdmin] = useState(false)
    const [adminKey, setAdminKey] = useState("");
    const [paperKeys, setPaperKeys] = useState(null);
    const [allUsers, setAllUsers] = useState([])
    const [roomCalledTo, setRoomCalledTo] = useState("Plenary");
    const [roomChoice, setRoomChoice] = useState("Plenary");
    const [queue, setQueue] = useState([])
    const [grid, setGrid] = useState([])
    const [queueCurrent, setQueueCurrent] = useState(0)
    const [probeCount, setProbeCount] = useState(0)
    const [probeWhen, setProbeWhen] = useState('')
    const [fileUploads, setFileUploads] = useState(null);
    const [socket, setSocket] = useState(null);
    const [serverGlobs, setServerGlobs] = useState(null)
    const [newStatus, setNewStatus] = useState("Tabled")
    const [guiBar, setGuiBar] = useState('');
    const [aboutMD, setAboutMD] = useState('');
    const [hideQ, setHideQ] = useState(false);
    const [hiddenMsg, setHiddenMsg] = useState("");
    const flasher = useFlasher()
    const flash = flasher["flash"]
    
    // for modal dialog 
    const [showModal, setShowModal] = useState(false)
    const [modalTitle, setModalTitle] = useState("")
    const [modalBody, setModalBody] = useState("")
    const [showLogs, setShowLogs] = useState(false)
    
    const controlledLog = useCallback( (...output) => {
        if (showLogs) {
            console.log(...output);
        }
    }, [showLogs] );
    
    const oidIsConflict = useCallback( oid => {
        if (!paperKeys) return true;
        return !(oid in paperKeys)
    }, [paperKeys] );

    const oidToNid = useCallback( oid => {
        if ( oidIsConflict(oid) ) return 0;
        return paperKeys[oid].nid
    }, [paperKeys, oidIsConflict] );

    const decryptMessageByOid = useCallback( (msg, oid) => {
        if ( oidIsConflict(oid) ) return '';
        const key = paperKeys[oid].key
        return decryptMsgUsingKey(msg, key)
    }, [paperKeys, oidIsConflict] );

    const decryptObjectOrNull = useCallback( obj => {
        if ( !obj || !obj.oid || oidIsConflict(obj.oid) ) return null;
        const str = decryptMessageByOid(obj.enc, obj.oid)
        // controlledLog("======= decrypted json: " + str)
        if (!str) return null
        return JSON.parse(str)
    }, [oidIsConflict, decryptMessageByOid] );

    const socketEmit = useCallback( (message, data) => {
        if (!socket || !socket.emit) {
            controlledLog("socket does not exist, message not sent.");
            return;
        }
        controlledLog("socketEmit: " + message);
        if (data) {
            socket.emit(message, data);
            return;
        }
        socket.emit(message);
    }, [socket, controlledLog] );
    
    const recordGlobsForThisRoom = useCallback( (data) => {
        controlledLog('record globs for this room:');
        controlledLog(data);
        data.message = getTimeInHiddenMessage(data.message);
        setHideQ(data.hide_queue);
        setHiddenMsg(data.message);
        if ('showAppLogs' in data) { // could be true or false or not exist
            setShowLogs(data.showAppLogs)
        }
        setServerGlobs(data);
        const curr = data ? data.current : 0;
        const status = data ? data.current_status : null;
        setQueueCurrent(curr);
        if (status) {
            setNewStatus(status);
        }
    }, [ controlledLog, setShowLogs, setServerGlobs, setQueueCurrent, setNewStatus,
        setHideQ, setHiddenMsg ] );
        
        useEffect(() => {
            const endpt = process.env.REACT_APP_SOCKET_ENDPOINT;
            const newSocket = endpt ? socketIOClient(endpt) : socketIOClient();
            setSocket(newSocket);
            return () => newSocket.close();
        }, [setSocket]);
        
        useEffect(() => {
            const showLogsEnv = Boolean(process.env.REACT_APP_SHOW_LOGS)
            if (showLogsEnv) {
                setShowLogs(showLogsEnv)  
            }
        }, [setShowLogs])
        
        useEffect(() => {
            controlledLog('roomChoice is now '+roomChoice);
            socketEmit('user_request_queue', roomChoice)
        }, [roomChoice, controlledLog, socketEmit]);
        
        useEffect(() => {
            
            const receiveWelcome = (data) => {
                controlledLog('received welcome:')
                controlledLog(data)
                setUser(data.user)
                const isAdmin = data.user && data.user.role_is_admin;
                setIsAdmin(isAdmin);
                if (isAdmin && data.all_users && data.all_users.length) {
                    setAllUsers(data.all_users);
                }
                if (isAdmin && data.admin_key && data.admin_key.length) {
                    setAdminKey(data.admin_key);
                }
                setPaperKeys(data.paper_keys)
                setAboutMD(smartquotes(data.about))
                if (data.user.room_name) {
                    //const room = roomCodeToRoom(data.user.in_room)
                    setRoomChoice(data.user.room_name)
                    setRoomCalledTo(data.user.room_name)
                }
                socketEmit('user_request_grid')
                socketEmit('user_request_queue', roomChoice)
            };
            
            function updateGridEntry(nid, status) {
                const grid_entry = grid && grid.papers ? grid.papers[nid] : null
                if (!grid_entry) {
                    controlledLog('*** cannot find grid entry for nid:', nid);
                    return;
                }
                // controlledLog('*** about to update grid entry:', grid_entry)
                if (status) {
                    grid_entry.status = status;
                    grid_entry.stickie = false;
                }
                else {
                    grid_entry.stickie = true;
                }
                //controlledLog('just updated grid entry:', grid_entry)
                const newGrid = { ...grid };
                setGrid(newGrid); // force update
            }
            
            function updateQueueEntry(queue_index, status) {
                if (queue_index < 0 || queue_index >= queue.length) {
                    controlledLog('cannot updateQueueEntry at queue_index ', queue_index);
                    return;
                }
                queue[queue_index].status = status;
                const newQueue = [...queue];
                setQueue(newQueue);
            }
            
            const receiveStickie = (grid_nid) => {
                controlledLog('received stickie: '+grid_nid);
                updateGridEntry(grid_nid, null); // null status -> set stickie
            }
            
            const receiveGlobs = (data) => {
                if (!data) {
                    controlledLog('WARNING! received globs with empty data');
                    return;
                }
                controlledLog('received globs:');
                controlledLog(data);
                // if there was an update, it was encrypted, so get it...
                if (data.update_encrypted) {
                    data.update = decryptObjectOrNull(data.update_encrypted)
                    controlledLog('decrypt update:');
                    controlledLog(data.update);
                }
                const isTheRoom = (data.room === roomChoice);
                if (isTheRoom) {
                    recordGlobsForThisRoom(data);
                    if (data.update) {
                        updateQueueEntry(data.update.queue_index, data.update.status)
                    }
                }
                if (data.update) {
                    updateGridEntry(data.update.grid_nid, data.update.status);
                }
                // bar is same for all rooms
                const barString = data.bar + '';
                setGuiBar(barString)
                // controlledLog('set bar to:', barString);  
            }
            
            const receiveQueue = (data) => {
                controlledLog('received queue:')
                controlledLog(data)
                const room = data.globs.room;
                const isTheRoom = (room === roomChoice);
                controlledLog('receiveQueue compare rooms: '+room+' '+roomChoice+' '+isTheRoom)
                if (isTheRoom) {
                    setQueue(data.paper_list) 
                    receiveGlobs(data.globs)
                    setProbeWhen('') // when queue arrives, invalidate probe
                }
                else {
                    // maybe need to check for other updates????XXX
                }
            };
            
            const receiveFileUploads = (file_uploads) => {
                controlledLog('received file upload status:')
                controlledLog(file_uploads)
                setFileUploads(file_uploads)
            };
            
            const receiveProbe = (count) => {
                const now = Date.now()
                const fmt = moment.utc(now).local().format('ddd h:mm:ss')
                controlledLog('received probe count: '+count+" "+fmt)
                setProbeCount(count)
                setProbeWhen(fmt)
            };
            
            const belongInRoom = (room) => {
                if (room === 'Plenary') {
                    return true;
                }
                const roomLetter = room.slice(-1); // last letter of room string
                if (user && user.rooms && user.rooms.includes(roomLetter)) {
                    return true;
                }
                return false;
            }
            
            const receiveCallToRoom = (room) => {
                if (room === roomChoice) { // already there
                    controlledLog('received call and already in room: '+room)
                    return; 
                }
                if (belongInRoom(room)) {
                    controlledLog('called to room: '+room)
                    setRoomChoice(room)
                    setRoomCalledTo(room)
                    flash("Admin brought you to "+room, "success", "room_change")
                }
            };
            
            const oidListToNidList = (oids) => {
                if (!oids || !oids.length) return null;
                const nids = oids.map( oid => oidToNid(oid) );
                const nids_no0 = nids.filter( nid => (nid > 0) )
                return nids_no0
            };

            const decodeGridPapers = (arr) => {
                const dec = arr.map( enc => decryptObjectOrNull(enc) )
                // returns dictionary indexed by nid
                const papers = {}
                for (let i = 0; i < dec.length; i++) {
                    const p = dec[i]
                    if (p) {
                        papers[p.nid] = p
                    }
                }
                return papers
            }

            const decodeGridData = (data) => {
                data.above_nids = oidListToNidList(data.above_oids)
                data.below_nids = oidListToNidList(data.below_oids)
                data.papers = decodeGridPapers(data.papers_encrypted)
            };

            const receiveGrid = (data) => {
                decodeGridData(data);
                controlledLog('received and decoded grid:');
                controlledLog(data);
                setGrid(data);
            };
            
            const receiveAlert = (data) => {
                if (isAdmin || !data.admin_only) {
                    setModalTitle(data.title);
                    setModalBody(data.body);
                    setShowModal(true);
                }
            }
            
            const receiveFlasher = (data) => {
                controlledLog('got flasher:')
                controlledLog(data)
                flash(data.message, data.type, data.which)
            }
            
            const receiveLogout = () => {
                controlledLog('got request to logout')
                window.location.href = '/auth/logout'
                // maybe: flash(data.message, data.type, data.which)
            }
            
            const receiveReload = () => {
                controlledLog('got request to reload')
                window.location.reload();
            }
            
            if (socket && 'on' in socket) {
                controlledLog('register welcome etc');
                socket.on('server_welcome', receiveWelcome);
                socket.on('server_set_queue', receiveQueue);
                socket.on('server_set_grid', receiveGrid);
                socket.on('server_set_globs', receiveGlobs);
                socket.on('server_set_stickie', receiveStickie);
                socket.on('server_send_alert', receiveAlert);
                socket.on('server_send_flasher', receiveFlasher);
                socket.on('server_probe_count', receiveProbe); 
                socket.on('server_file_uploads', receiveFileUploads); 
                socket.on('server_call_to_room', receiveCallToRoom); 
                socket.on('server_logout_user', receiveLogout); 
                socket.on('server_reload_user', receiveReload); 
            }
            
            // return from useEffect is function that does cleanup
            return () => {
                if (socket && 'off' in socket) {
                    controlledLog('socket cleanup');
                    socket.off('server_welcome', receiveWelcome);
                    socket.off('server_set_queue', receiveQueue);
                    socket.off('server_set_grid', receiveGrid);
                    socket.off('server_set_globs', receiveGlobs);
                    socket.off('server_set_stickie', receiveStickie);
                    socket.off('server_send_alert', receiveAlert);
                    socket.off('server_send_flasher', receiveFlasher);
                    socket.off('server_probe_count', receiveProbe);
                    socket.off('server_file_uploads', receiveFileUploads); 
                    socket.off('server_call_to_room', receiveCallToRoom);
                    socket.off('server_logout_user', receiveLogout);
                    socket.off('server_reload_user', receiveReload);  
                }
            };
        }, [queue, grid, socket, flash, isAdmin, roomChoice, user, paperKeys,
            controlledLog, socketEmit, recordGlobsForThisRoom, oidToNid,
            oidIsConflict, decryptMessageByOid, decryptObjectOrNull]);
            
            function checkValidNID(nid){
                if (!grid || !grid.papers) return false
                return (nid in grid.papers)
            }
            
            return (
                <AppGlobalsContext.Provider 
                value={{
                    "user": user,
                    "isAdmin": isAdmin,
                    "adminKey": adminKey,
                    "paperKeys": paperKeys,
                    "allUsers": allUsers,
                    "roomCalledTo": roomCalledTo,
                    "roomChoice": roomChoice,
                    "setRoomChoice": setRoomChoice,
                    "queue": queue,
                    "grid": grid,
                    "aboutMD": aboutMD,
                    "queueCurrent": queueCurrent,
                    "newStatus": newStatus,
                    "setNewStatus": setNewStatus,
                    "socketEmit": socketEmit,
                    "serverGlobs": serverGlobs,
                    "showModal": showModal,
                    "setShowModal": setShowModal,
                    "modalTitle": modalTitle,
                    "setModalTitle": setModalTitle,
                    "setModalBody": setModalBody,
                    "modalBody": modalBody,
                    "probeCount": probeCount,
                    "probeWhen": probeWhen,
                    "fileUploads": fileUploads,
                    "guiBar": guiBar,
                    "setGuiBar": setGuiBar,
                    "hideQ": hideQ,
                    "setHideQ": setHideQ,
                    "hiddenMsg": hiddenMsg,
                    "setHiddenMsg": setHiddenMsg,
                    "controlledLog": controlledLog,
                    "statusList": ['Tabled','Reject','Conference','Journal'],
                    "checkValidNID": checkValidNID
                }}>
                {children}
                </AppGlobalsContext.Provider>
                )
            }
            
