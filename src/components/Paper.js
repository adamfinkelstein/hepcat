import moment from 'moment';
import Container from 'react-bootstrap/Container';
import { useQueue } from '../contexts/QueueContext';
import { useUser } from '../contexts/UserContext';
import { useState, useEffect } from 'react';
import CollapsibleParagraph from './CollapsibleParagraph.js';

export default function Paper() {
  const [currentTime, setCurrentTime] = useState(Date.now());

  const { roomChoice, isOutsideRole, isScreenOrOutside } = useUser();
  const { queue, queueCurrent, roomGlobs } = useQueue();
  const isPaper =
    queue && queue.length && queueCurrent < queue.length && queueCurrent >= 0;
  const currentShow = isPaper && roomGlobs.current_show;
  const currentShowEnter = isPaper ? roomGlobs.current_show_enter : 0;
  const cp = isPaper ? queue[queueCurrent] : null; // current paper
  const isConflict = cp ? cp.nid === 0 : false;
  const showTags = isPaper && roomGlobs.current_tags;
  const hist = isPaper ? roomGlobs.current_history : [];
  const showHist = hist && hist.length > 0;
  const safeScores = cp ? cp.all_scores : '';
  const scoresHTML = formatScoresInHTML(safeScores);
  const currentStart = isPaper && roomGlobs.current_start;
  const hideAbstract = isScreenOrOutside();
  const hidePaperOutside = isOutsideRole() && currentShow;
  const hideThisPaper = hidePaperOutside || !isPaper || isConflict;
  const hideMessage = isConflict
    ? 'CONFLICT'
    : !isPaper
      ? 'No current paper.'
      : 'In session.';

  function userBelongsInRoom(user, room) {
    const rooms = user.rooms;
    if (!rooms || !rooms.length) return false;
    return rooms.includes(room);
  }

  // sort through conflicts.
  // reorder depending on whether they belong in this room or not.
  function siftConflicts(conflicts) {
    if (!roomChoice || !roomChoice.length || roomChoice === 'Plenary') {
      return conflicts; // no changes
    }
    const inRoom = [];
    const outRoom = [];
    for (let i = 0; i < conflicts.length; i++) {
      let ci = conflicts[i];
      if (userBelongsInRoom(ci, roomChoice)) {
        inRoom.push(ci);
      } else {
        ci.otherRoom = true;
        outRoom.push(ci);
      }
    }
    const result = inRoom.concat(outRoom);
    return result;
  }

  // XXX Ugly code: currentShowEnter is 0, 1, or -1.
  // Comes from database entry in GQ.
  // Should probably be a pair of booleans.
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

  function formatScoresInHTML(scores) {
    let html = scores ? scores : '';
    // RE matches any capital letter followed by !
    // with the letter wrapped in <b> tags.
    html = html.replace(/([A-Z])!/g, '<b>$1</b>');
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
    const diff = sec2 - sec1;
    if (diff < 0) {
      return '00:00';
    } else if (diff >= 3600) {
      return '> 1hr';
    }
    const msDiff = diff * 1000;
    const format = moment.utc(msDiff).format('mm:ss');
    return format;
  }

  function userToClass(user) {
    let className = 'bigger-font';
    if (user.role_is_admin || user.role_name === 'Backup') {
      className += ' admin-user';
    }
    if (user.otherRoom) {
      className += ' other-room';
    } else {
      className += ' bold-user';
    }
    return className;
  }

  return (
    <Container fluid className="Paper">
      <div>
        {hideThisPaper ? (
          <p className="paper-message">{hideMessage}</p>
        ) : !currentShow ? (
          <div>
            {conflicts_arrays.map((conf_arr, conf_ind) => {
              return conf_arr.show ? (
                <div key={conf_ind}>
                  <h3>{conf_arr.title}</h3>
                  <ul>
                    {conf_arr.array.map((user, user_ind) => {
                      return (
                        <li key={user_ind}>
                          <span className={userToClass(user)}>
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
            <div className="paper-timer bigger-font">
              {formatTime(currentTime)}
            </div>
            <p className="bigger-font">
              <span className="paper-par-header">
                Q{cp.queue_order} ({cp.nid}):
              </span>
              {cp.title}
            </p>
            {showTags && (
              <p className="bigger-font">
                <span className="paper-par-header">Tags:</span>
                <span>{roomGlobs.current_tags}</span>
              </p>
            )}
            <p className="bigger-font">
              <span className="paper-par-header">Reviews: </span>
              <span dangerouslySetInnerHTML={scoresHTML} />
            </p>
            {showHist && (
              <p className="bigger-font">
                <span className="paper-par-header">History:</span>
                <span>{formatHistoryList(hist)}</span>
              </p>
            )}

            {!hideAbstract && (
              <CollapsibleParagraph title="Abstract" text={cp.abstract} />
            )}

            <div className="d-flex justify-content-center">
              <img
                src={cp.thumbnail}
                className="mt-4 w-75"
                alt="Representative Pic for Paper"
              ></img>
            </div>
          </div>
        )}
      </div>
    </Container>
  );
}
