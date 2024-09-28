import moment from 'moment';
import Container from 'react-bootstrap/Container';
import { useAppGlobals } from '../contexts/AppContext';
import { useUser } from '../contexts/UserContext';
import { useState, useEffect } from 'react';
import CollapsibleParagraph from './CollapsibleParagraph.js';

export default function Paper() {
  const [currentTime, setCurrentTime] = useState(Date.now());

  const { user, roomChoice } = useUser();
  const isOutsideRole = user?.role_name === 'Outside';
  const globals = useAppGlobals();
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
  const hidePaperOutside = isOutsideRole && currentShow;
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
    const oneHour = 60 * 60;
    const msDiff = Math.max(0, diff) * 1000;
    const format = moment.utc(msDiff).format('mm:ss');
    if (diff >= oneHour) {
      return '--:--';
    }
    return format;
  }

  function userToClass(user) {
    let className = 'font-size-3';
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
                  <span className="font-size-2">{conf_arr.title}</span>
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
            <div className="paper-timer font-size-3">
              {formatTime(currentTime)}
            </div>
            <p className="font-size-3">
              <span className="paper-par-header">
                Q{cp.queue_order} ({cp.nid}):
              </span>
              {cp.title}
            </p>
            {showTags && (
              <p className="font-size-4">
                <span className="paper-par-header">Tags:</span>
                <span>{globals.serverGlobs.current_tags}</span>
              </p>
            )}
            <p className="font-size-4">
              <span className="paper-par-header">Reviews: </span>
              <span dangerouslySetInnerHTML={scoresHTML} />
            </p>
            {showHist && (
              <p className="font-size-4">
                <span className="paper-par-header">History:</span>
                <span>{formatHistoryList(hist)}</span>
              </p>
            )}

            <CollapsibleParagraph title="Abstract" text={cp.abstract} />

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
