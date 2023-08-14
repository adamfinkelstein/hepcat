import moment from 'moment';
import Container from 'react-bootstrap/Container';
import { useAppGlobals } from '../contexts/AppContext';
import { useState, useEffect } from 'react';
import CollapsibleParagraph from './CollapsibleParagraph.js';

export default function Paper() {
  const [currentTime, setCurrentTime] = useState(Date.now());

  const globals = useAppGlobals();
  const user = globals.user;
  const isScreen = user && user.role_name === 'Screen';
  const queue = globals.queue;
  const isPaper =
    queue &&
    queue.length &&
    globals.queueCurrent < queue.length &&
    globals.queueCurrent >= 0;
  const queueCurrent = globals.queueCurrent;
  const currentShow = isPaper && globals.serverGlobs.current_show;
  const currentShowEnter = isPaper ? globals.serverGlobs.current_show_enter : 0;
  const cp = isPaper ? queue[queueCurrent] : null; // current paper
  const isConflict = cp ? cp.nid === 0 : false;
  const showTags = isPaper && globals.serverGlobs.current_tags;
  const hist = isPaper ? globals.serverGlobs.current_history : [];
  const showHist = hist && hist.length > 0;
  const safeScores = cp ? cp.all_scores : '';
  const scoresHTML = formatScoresInHTML(safeScores);
  const currentStart = isPaper && globals.serverGlobs.current_start;
  const hideThisPaper = !isPaper || isConflict;
  const hideMessage = isConflict ? 'CONFLICTED!' : 'No current paper.';
  const roomChoice = globals.roomChoice;

  function userBelongsInRoom(user, roomLetter) {
    const rooms = user.rooms;
    if (!rooms || !rooms.length) return false;
    return rooms.indexOf(roomLetter) !== -1;
  }

  function userAddRoomLetterPrefix(user, letterPos) {
    const rooms = user.rooms;
    if (!rooms || rooms.length < letterPos + 1) return;
    const roomLetter = rooms.charAt(letterPos);
    user.room_prefix = roomLetter + ': ';
  }

  // sort through conflicts reording depending on whether they
  // belong in this room or another room.
  function siftConflicts(conflicts) {
    if (!roomChoice || !roomChoice.length || roomChoice === 'Plenary') {
      return conflicts; // no changes
    }
    const roomLetter = roomChoice.slice(-1); // gets final char
    const letterPos = roomLetter === 'X' || roomLetter === 'Y' ? 1 : 0;
    const inRoom = [];
    const outRoom = [];
    for (let i = 0; i < conflicts.length; i++) {
      let ci = conflicts[i];
      userAddRoomLetterPrefix(ci, letterPos);
      if (userBelongsInRoom(ci, roomLetter)) {
        inRoom.push(ci);
      } else {
        ci.otherRoom = true;
        outRoom.push(ci);
      }
    }
    const result = inRoom.concat(outRoom);
    return result;
  }

  let current_enter = isPaper && currentShowEnter === 1 ? cp.enter : [];
  let current_leave = isPaper && currentShowEnter === 1 ? cp.leave : [];
  if (isPaper && currentShowEnter === -1) {
    current_enter = [];
    current_leave = [];
    if (queueCurrent < queue.length - 1) {
      let np = queue[queueCurrent + 1]; // next paper
      current_enter = np.leave; // note backward because of prev button
      current_leave = np.enter;
    }
  }
  const conflicts_arrays = [
    {
      show: true,
      title: 'Conflicts:',
      array: isPaper && cp && cp.conflicts ? siftConflicts(cp.conflicts) : [],
      default: '(none)',
    },
    {
      show: current_leave && current_leave.length,
      title: 'Leave:',
      array: siftConflicts(current_leave),
      default: '',
    },
    {
      show: current_enter && current_enter.length,
      title: 'Return:',
      array: siftConflicts(current_enter),
      default: '',
    },
  ];

  function extraSpaceBefore(scores, before) {
    const after = '&nbsp;&nbsp;&nbsp;' + before;
    const ret = scores.replace(before, after);
    return ret;
  }

  function formatScoresInHTML(scores) {
    let html = scores ? scores : '';
    html = html.replaceAll('A!', '<b>A</b>');
    html = html.replaceAll('R!', '<b>R</b>');
    html = extraSpaceBefore(html, 'j[');
    html = extraSpaceBefore(html, 'c[');
    html = extraSpaceBefore(html, 'bbs:');
    const ret = { __html: html };
    return ret;
  }

  function formatHistoryElement(h) {
    return (
      h.status +
      ' (' +
      h.context +
      ' ' +
      moment.utc(h.when).local().format('ddd LT') +
      ')'
    );
  }

  function formatHistoryList(histList) {
    if (!histList) return '';
    const fmt = histList.map(formatHistoryElement).join(', ');
    return fmt;
  }

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  // FOR TIMER:

  function dateToSecs(date) {
    return moment.utc(date).local().unix();
  }

  function formatTime(date) {
    if (!currentShow || !currentStart) {
      return '';
    }
    const sec1 = dateToSecs(currentStart);
    const sec2 = dateToSecs(date);
    const msDiff = Math.max(0, sec2 - sec1) * 1000;
    const format = moment.utc(msDiff).format('mm:ss');
    return format;
  }

  function userToClass(user) {
    let className = 'font-size-3';
    if (user.role_is_admin) {
      className += ' admin-user';
    }
    if (user.otherRoom) {
      className += ' other-room';
    }
    return className;
  }

  return (
    <Container className="Paper">
      <div>
        {hideThisPaper ? (
          <p>{hideMessage}</p>
        ) : !currentShow ? (
          <div>
            {conflicts_arrays.map((conf_arr, conf_ind) => {
              return conf_arr.show ? (
                <div key={conf_ind}>
                  <span className="font-size-2">{conf_arr.title}</span>
                  <ul>
                    {conf_arr.array.map((user, user_ind) => {
                      return (
                        <li key={user_ind}>
                          <span className={userToClass(user)}>
                            {user.room_prefix}
                            {user.full_name}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : (
                <p key={conf_ind}>{conf_arr.default}</p>
              );
            })}
          </div>
        ) : (
          <div>
            {!isScreen && (
              <div className="paper-timer font-size-3">
                {formatTime(currentTime)}
              </div>
            )}
            <p className="paper-title font-size-2">
              Q{cp.queue_order} ({cp.nid}): {cp.title}
            </p>
            {showTags && (
              <p className="font-size-4">
                <span className="paper-par-header">Tags:</span>{' '}
                <span className="paper-history-text">
                  {globals.serverGlobs.current_tags}
                </span>
              </p>
            )}
            <p className="font-size-4">
              <span className="paper-par-header">Reviews: </span>
              <span
                className="paper-reviews-text"
                dangerouslySetInnerHTML={scoresHTML}
              />
            </p>
            {showHist && (
              <p className="font-size-4">
                <span className="paper-par-header">History:</span>{' '}
                <span className="paper-history-text">
                  {formatHistoryList(hist)}
                </span>
              </p>
            )}

            <CollapsibleParagraph title="Abstract" text={cp.abstract} />

            <div className="paper-img-container">
              <img
                src={cp.thumbnail}
                className="paper-image"
                alt="Representative Pic for Paper"
              ></img>
            </div>
          </div>
        )}
      </div>
    </Container>
  );
}
