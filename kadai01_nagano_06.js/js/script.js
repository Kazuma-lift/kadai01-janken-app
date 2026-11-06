const hands = ['グー', 'チョキ', 'パー'];

const scores = {
  win: 0,
  lose: 0,
  draw: 0,
};

let stepTimer = null;
let isAutoPlaying = false;
let currentRound = null;
let currentSteps = null;
let currentIndex = 0;
let pastLogs = [];
let hideCurrentLogs = false;
const PLAY_INTERVAL = 2000;

function getPlayerHand(hand) {
  const playerHand = hand;
  return playerHand;
}

function decideCpuHand() {
  const index = Math.floor(Math.random() * hands.length);
  const cpuHand = hands[index];
  return {
    index: index,
    cpuHand: cpuHand,
  };
}

function judge(playerHand, cpuHand) {
  if (playerHand === cpuHand) {
    return '引き分け';
  }
  if (
    (playerHand === 'グー' && cpuHand === 'チョキ') ||
    (playerHand === 'チョキ' && cpuHand === 'パー') ||
    (playerHand === 'パー' && cpuHand === 'グー')
  ) {
    return '勝ち';
  }
  return '負け';
}

function updateScore(result) {
  if (result === '勝ち') {
    scores.win += 1;
  } else if (result === '負け') {
    scores.lose += 1;
  } else {
    scores.draw += 1;
  }
}

function resetScore() {
  scores.win = 0;
  scores.lose = 0;
  scores.draw = 0;
}

function quote(value) {
  return '"' + value + '"';
}

function renderCode(fn, snippets) {
  const $code = $('.code-view');
  if ($code.length === 0) {
    return;
  }
  const lines = fn.toString().split('\n');
  $code.empty();
  lines.forEach(function (line) {
    const $line = $('<span>', {
      class: 'code-line',
      text: line.length ? line : ' ',
    });
    if (snippets.some(function (snippet) {
      return line.includes(snippet);
    })) {
      $line.addClass('is-active');
    }
    $code.append($line);
  });
  const codeElement = $code.get(0);
  const activeLine = $code.find('.is-active').get(0);
  if (codeElement && activeLine) {
    const lineTop = activeLine.offsetTop;
    const lineBottom = lineTop + activeLine.offsetHeight;
    if (lineTop < codeElement.scrollTop) {
      codeElement.scrollTop = lineTop;
    } else if (lineBottom > codeElement.scrollTop + codeElement.clientHeight) {
      codeElement.scrollTop = lineBottom - codeElement.clientHeight;
    }
  }
}

function renderCodeMessage(message) {
  const $code = $('.code-view');
  if ($code.length === 0) {
    return;
  }
  $code.empty();
  $code.append($('<span>', { class: 'code-line', text: message }));
}

function renderVariables(rows) {
  const $list = $('.var-list');
  if ($list.length === 0) {
    return;
  }
  $list.empty();
  rows.forEach(function (row) {
    const $row = $('<div>', { class: 'var-row' });
    $row.append($('<span>', { class: 'var-name', text: row.name }));
    const $value = $('<span>', { class: 'var-value', text: row.value });
    if (row.changed) {
      $value.addClass('is-changed');
    }
    $row.append($value);
    $list.append($row);
  });
}

function renderExplanation(title, what, why) {
  $('.explain-title').text(title);
  $('.explain-body').text(what);
  $('.explain-why').text(why);
}

function appendLogItem($list, count, name, value, active) {
  const $item = $('<li>', { class: active ? 'log-item is-active' : 'log-item' });
  $item.append($('<span>', { class: 'log-step', text: String(count) }));
  $item.append($('<span>', { class: 'log-name', text: name }));
  $item.append($('<span>', { class: 'log-result', text: value }));
  $list.append($item);
}

function showIdleLog() {
  const $list = $('.log-list');
  if ($list.length === 0) {
    return;
  }
  $list.empty();
  $list.append($('<li>', {
    class: 'log-item is-empty',
    text: 'まだログはありません',
  }));
}

function setControlsLocked(locked) {
  $('.hand-button').prop('disabled', locked);
  $('.score-reset').prop('disabled', locked);
}

function isGameLocked() {
  if (!currentSteps || currentSteps.length === 0) {
    return false;
  }
  if (isAutoPlaying) {
    return true;
  }
  return currentIndex < currentSteps.length - 1;
}

function updatePlaybackControls() {
  const hasSteps = Boolean(currentSteps && currentSteps.length > 0);
  const lastIndex = hasSteps ? currentSteps.length - 1 : 0;
  const atStart = !hasSteps || currentIndex <= 0;
  const atEnd = !hasSteps || currentIndex >= lastIndex;
  $('.playback-controls').toggleClass('is-playing', isAutoPlaying);
  $('.playback-first, .playback-back').prop('disabled', atStart);
  $('.playback-forward, .playback-last').prop('disabled', atEnd);
  $('.playback-play').prop('disabled', !hasSteps);
}

function renderDisplayedScore(score) {
  $('.score-win').text(String(score.win));
  $('.score-lose').text(String(score.lose));
  $('.score-draw').text(String(score.draw));
}

function renderAppAt(round, index) {
  if (round.kind === 'reset') {
    $('.hand-button').removeClass('is-selected').attr('aria-pressed', 'false');
    $('.player-hand').text('—');
    $('.cpu-hand').text('—');
    renderJudgment('');
    renderDisplayedScore(round.scoreAfter);
    return;
  }
  markSelected(round.playerHand);
  $('.player-hand').text(round.playerHand);
  $('.cpu-hand').text(index >= 1 ? round.cpuHand : '—');
  renderJudgment(index >= 2 ? round.result : '');
  renderDisplayedScore(index >= 3 ? round.scoreAfter : round.scoreBefore);
}

function renderPlaybackLog(index) {
  const $list = $('.log-list');
  if ($list.length === 0) {
    return;
  }
  $list.empty();
  let count = 0;
  pastLogs.forEach(function (entry) {
    count += 1;
    appendLogItem($list, count, entry.title, entry.logValue, false);
  });
  if (!hideCurrentLogs && currentSteps) {
    for (let stepIndex = 0; stepIndex <= index; stepIndex += 1) {
      count += 1;
      appendLogItem(
        $list,
        count,
        currentSteps[stepIndex].title,
        currentSteps[stepIndex].logValue,
        stepIndex === index
      );
    }
  }
  if (count === 0) {
    showIdleLog();
    return;
  }
  const listElement = $list.get(0);
  if (listElement) {
    listElement.scrollTop = listElement.scrollHeight;
  }
}

function showStepAt(index) {
  if (!currentSteps || !currentRound) {
    return;
  }
  currentIndex = index;
  const step = currentSteps[index];
  renderAppAt(currentRound, index);
  renderCode(step.code, step.snippets);
  renderVariables(step.variables);
  renderExplanation(step.title, step.what, step.why);
  renderPlaybackLog(index);
  updatePlaybackControls();
  setControlsLocked(isGameLocked());
}

function stopAutoplay() {
  if (stepTimer !== null) {
    clearTimeout(stepTimer);
    stepTimer = null;
  }
  isAutoPlaying = false;
  updatePlaybackControls();
  setControlsLocked(isGameLocked());
}

function scheduleAdvance() {
  if (stepTimer !== null) {
    clearTimeout(stepTimer);
  }
  stepTimer = setTimeout(function () {
    stepTimer = null;
    if (!isAutoPlaying || !currentSteps) {
      return;
    }
    if (currentIndex >= currentSteps.length - 1) {
      stopAutoplay();
      return;
    }
    showStepAt(currentIndex + 1);
    if (!isAutoPlaying || currentIndex >= currentSteps.length - 1) {
      stopAutoplay();
      return;
    }
    scheduleAdvance();
  }, PLAY_INTERVAL);
}

function beginAutoplay() {
  if (!currentSteps || currentSteps.length === 0 || isAutoPlaying) {
    return;
  }
  if (currentIndex >= currentSteps.length - 1) {
    hideCurrentLogs = false;
    showStepAt(0);
  }
  if (currentSteps.length === 1 || currentIndex >= currentSteps.length - 1) {
    stopAutoplay();
    return;
  }
  isAutoPlaying = true;
  updatePlaybackControls();
  setControlsLocked(true);
  scheduleAdvance();
}

function commitPreviousRound() {
  if (currentSteps && !hideCurrentLogs) {
    currentSteps.forEach(function (step) {
      pastLogs.push({
        title: step.title,
        logValue: step.logValue,
      });
    });
  }
  hideCurrentLogs = false;
}

// 勝敗とスコアはクリック直後に確定する。
// APPとJS LOGは、記録した同じステップを表示する。自動再生は2秒間隔。
function startRound(round, steps) {
  if (isGameLocked()) {
    return;
  }
  stopAutoplay();
  commitPreviousRound();
  currentRound = round;
  currentSteps = steps;
  hideCurrentLogs = false;
  showStepAt(0);
  beginAutoplay();
}

function renderScore() {
  renderDisplayedScore(scores);
}

function scoreRows(before, after) {
  return [
    {
      name: 'scores.win',
      value: before.win + ' → ' + after.win,
      changed: before.win !== after.win,
    },
    {
      name: 'scores.lose',
      value: before.lose + ' → ' + after.lose,
      changed: before.lose !== after.lose,
    },
    {
      name: 'scores.draw',
      value: before.draw + ' → ' + after.draw,
      changed: before.draw !== after.draw,
    },
  ];
}

function copyScores() {
  return {
    win: scores.win,
    lose: scores.lose,
    draw: scores.draw,
  };
}

function buildPlaySteps(round) {
  const judgmentSnippet = round.result === '引き分け'
    ? "return '引き分け'"
    : round.result === '勝ち'
      ? "return '勝ち'"
      : "return '負け'";
  const scoreSnippet = round.result === '勝ち'
    ? 'scores.win += 1'
    : round.result === '負け'
      ? 'scores.lose += 1'
      : 'scores.draw += 1';

  return [
    {
      code: getPlayerHand,
      snippets: ['const playerHand'],
      title: 'プレイヤーの手を取得',
      what: '押したボタンの文字を、playerHand という変数に入れています。変数は、値に名前を付けて覚えておく入れ物です。',
      why: 'この後の勝敗判定で、あなたの手が何かを参照するためです。',
      logValue: round.playerHand,
      variables: [
        { name: 'playerHand', value: '未定 → ' + quote(round.playerHand), changed: true },
      ],
    },
    {
      code: decideCpuHand,
      snippets: ['Math.floor'],
      title: 'CPUの手を決定',
      what: 'Math.random() は 0 以上 1 未満の小数を作ります。それを手の数だけ倍にして小数を切り捨てると、0、1、2 のどれかになります。hands はグー・チョキ・パーを並べたもので、その番号の手を CPU の手にしています。',
      why: 'CPU の手を、実行のたびに選び直すためです。',
      logValue: round.cpuHand,
      variables: [
        { name: 'index', value: '未定 → ' + round.cpuIndex, changed: true },
        { name: 'cpuHand', value: '未定 → ' + quote(round.cpuHand), changed: true },
      ],
    },
    {
      code: judge,
      snippets: [judgmentSnippet],
      title: '勝敗を判定',
      what: 'あなたの手と CPU の手が同じなら引き分けです。違う場合は、グーはチョキに勝ち、チョキはパーに勝ち、パーはグーに勝ちます。どの勝ち筋にも当てはまらなければ負けです。',
      why: '画面に出す前に、結果を「勝ち」「負け」「引き分け」のどれか一つに決めるためです。',
      logValue: round.result,
      variables: [
        { name: 'playerHand', value: quote(round.playerHand), changed: false },
        { name: 'cpuHand', value: quote(round.cpuHand), changed: false },
        { name: 'result', value: '未定 → ' + quote(round.result), changed: true },
      ],
    },
    {
      code: updateScore,
      snippets: [scoreSnippet],
      title: 'スコアを更新',
      what: '判定が勝ちなら勝ちの回数、負けなら負けの回数、引き分けなら引き分けの回数に 1 を足しています。回数は scores という名前でまとめて覚えています。',
      why: '1回ごとの結果に加えて、これまでの合計を画面に残すためです。',
      logValue: scoreText(round.scoreAfter),
      variables: scoreRows(round.scoreBefore, round.scoreAfter),
    },
  ];
}

function scoreText(score) {
  return '勝ち ' + score.win + ' / 負け ' + score.lose + ' / 引き分け ' + score.draw;
}

function markSelected(hand) {
  $('.hand-button').removeClass('is-selected').attr('aria-pressed', 'false');
  $('.hand-button').filter(function () {
    return $(this).attr('data-hand') === hand;
  }).addClass('is-selected').attr('aria-pressed', 'true');
}

function renderJudgment(result) {
  const $judgment = $('.judgment-value');
  $judgment.removeClass('is-win is-lose is-draw');
  if (result === '勝ち') {
    $judgment.text('勝ち').addClass('is-win');
  } else if (result === '負け') {
    $judgment.text('負け').addClass('is-lose');
  } else if (result === '引き分け') {
    $judgment.text('引き分け').addClass('is-draw');
  } else {
    $judgment.text('—');
  }
}

function moveTo(index) {
  if (!currentSteps) {
    return;
  }
  if (index < 0 || index >= currentSteps.length || index === currentIndex) {
    return;
  }
  stopAutoplay();
  hideCurrentLogs = false;
  showStepAt(index);
}

function onPlayClick() {
  beginAutoplay();
}

function onPauseClick() {
  stopAutoplay();
}

function onFirstClick() {
  moveTo(0);
}

function onBackClick() {
  moveTo(currentIndex - 1);
}

function onForwardClick() {
  moveTo(currentIndex + 1);
}

function onLastClick() {
  if (!currentSteps) {
    return;
  }
  moveTo(currentSteps.length - 1);
}

function onHandClick(event) {
  if (isGameLocked()) {
    return;
  }
  const hand = $(event.currentTarget).attr('data-hand');
  if (!hands.includes(hand)) {
    return;
  }

  const scoreBefore = copyScores();
  const playerHand = getPlayerHand(hand);
  const cpu = decideCpuHand();
  const result = judge(playerHand, cpu.cpuHand);
  updateScore(result);
  const round = {
    kind: 'play',
    playerHand: playerHand,
    cpuIndex: cpu.index,
    cpuHand: cpu.cpuHand,
    result: result,
    scoreBefore: scoreBefore,
    scoreAfter: copyScores(),
  };
  startRound(round, buildPlaySteps(round));
}

function onResetClick() {
  if (isGameLocked()) {
    return;
  }
  const scoreBefore = copyScores();
  resetScore();
  const round = {
    kind: 'reset',
    scoreBefore: scoreBefore,
    scoreAfter: copyScores(),
  };
  startRound(round, [
    {
      code: resetScore,
      snippets: ['scores.win = 0', 'scores.lose = 0', 'scores.draw = 0'],
      title: 'スコアをリセット',
      what: '勝ち・負け・引き分けの回数を、すべて 0 に戻しています。',
      why: '合計を消して、最初から数え直せるようにするためです。',
      logValue: scoreText(round.scoreAfter),
      variables: scoreRows(round.scoreBefore, round.scoreAfter),
    },
  ]);
}

function onLogClearClick() {
  const wasPlaying = isAutoPlaying || stepTimer !== null;
  stopAutoplay();
  if (wasPlaying && currentSteps && currentIndex < currentSteps.length - 1) {
    hideCurrentLogs = false;
    showStepAt(currentSteps.length - 1);
  }
  pastLogs = [];
  hideCurrentLogs = true;
  showIdleLog();
  updatePlaybackControls();
  setControlsLocked(isGameLocked());
}

function onFoldToggleClick(event) {
  const $button = $(event.currentTarget);
  const $block = $button.closest('.log-block');
  const expanded = $button.attr('aria-expanded') === 'true';
  $block.find('.fold-toggle').attr('aria-expanded', expanded ? 'false' : 'true');
  $block.toggleClass('is-folded', expanded);
}

function showIdlePanel() {
  renderCodeMessage('手を選ぶと、ここに処理のコードが表示されます。');
  renderVariables([
    { name: 'scores.win', value: '0', changed: false },
    { name: 'scores.lose', value: '0', changed: false },
    { name: 'scores.draw', value: '0', changed: false },
  ]);
  renderExplanation(
    '手を選ぶと処理が始まります',
    'グー・チョキ・パーのボタンを押すと、手の取得、CPU の手、勝敗、スコア更新の順に表示されます。',
    'コードがどの順番で動くかを、1段階ずつ確認するためです。'
  );
  showIdleLog();
  updatePlaybackControls();
}

$(function () {
  const $hands = $('.hand-button');
  const $reset = $('.score-reset');
  const $logClear = $('.log-clear');
  const $playback = $('.playback-controls');
  if ($hands.length === 0 || $reset.length === 0 || $logClear.length === 0 || $playback.length === 0) {
    return;
  }
  $hands.on('click', onHandClick);
  $reset.on('click', onResetClick);
  $logClear.on('click', onLogClearClick);
  $('.playback-first').on('click', onFirstClick);
  $('.playback-back').on('click', onBackClick);
  $('.playback-play').on('click', onPlayClick);
  $('.playback-pause').on('click', onPauseClick);
  $('.playback-forward').on('click', onForwardClick);
  $('.playback-last').on('click', onLastClick);
  $('.fold-toggle').on('click', onFoldToggleClick);
  renderScore();
  showIdlePanel();
});
