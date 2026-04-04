// Copyright (c) 2025 Adam Finkelstein
// Licensed under the Apache 2.0 License. See LICENSE file for details.

import { DateTime } from 'luxon';
import { useQueue } from '../contexts/QueueContext';
import { useUser } from '../contexts/UserContext';
import { useState, useEffect } from 'react';
import CollapsibleParagraph from './CollapsibleParagraph';

function formatScoresInHTML(scores) {
  let html = scores ? scores : '';
  // RE matches any capital letter followed by !
  // with the letter wrapped in <b> tags.
  html = html.replace(/([A-Z])!/g, '<b>$1</b>');
  // RE matches text within curly braces and wraps it in a span with class "other-room"
  html = html.replace(/\{([^}]*)\}/g, '<span class="old-score">$1</span>');
  const ret = { __html: html };
  return ret;
}

function formatHistoryElement(h) {
  const when = DateTime.fromISO(h.when).toLocal().toFormat('ccc t');
  return h.status + ' (' + h.context + ' ' + when + ')';
}

function formatHistoryList(histList) {
  if (!histList) return '';
  const fmt = histList.map(formatHistoryElement).join(', ');
  return fmt;
}

export default function PaperInfo() {
  const [currentTime, setCurrentTime] = useState(Date.now());

  const { isScreenOrOutside } = useUser();
  const { queue, queueCurrent, isCurrentPaper, roomGlobs } = useQueue();
  const currentShow = isCurrentPaper && roomGlobs.current_show;
  const cp = isCurrentPaper ? queue[queueCurrent] : null; // current paper
  const showTags = isCurrentPaper && roomGlobs.current_tags;
  const hist = isCurrentPaper ? roomGlobs.current_history : [];
  const showHist = hist && hist.length > 0;
  const safeScores = cp ? cp.all_scores : '';
  const scoresHTML = formatScoresInHTML(safeScores);
  const currentStart = isCurrentPaper && roomGlobs.current_start;
  const hideAbstract = isScreenOrOutside();

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  // FOR TIMER:

  function dateToSecs(date) {
    return DateTime.fromISO(date, { zone: 'utc' }).toUnixInteger();
  }

  function formatTime(nowInMS) {
    if (!currentShow || !currentStart) return '';

    const startSecs = dateToSecs(currentStart);
    const nowInSecs = Math.floor(nowInMS / 1000);
    const duration = nowInSecs - startSecs;

    if (duration < 0) return '00:00';
    if (duration >= 3600) return '> 1hr';

    return DateTime.fromSeconds(duration).toFormat('mm:ss');
  }

  return (
    <div>
      <div className="paper-timer bigger-font">{formatTime(currentTime)}</div>
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
  );
}
