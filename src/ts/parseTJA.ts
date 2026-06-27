// @ts-nocheck

import { addZero, arrayLcm } from './common';

export enum CourseDifficulty {
  Easy = 0,
  Normal = 1,
  Hard = 2,
  Oni = 3,
  Edit = 4,
}

function parseCourseValue(courseValue) {
  switch (courseValue.toLowerCase()) {
    case 'easy':
    case '0':
      return CourseDifficulty.Easy;

    case 'normal':
    case '1':
      return CourseDifficulty.Normal;

    case 'hard':
    case '2':
      return CourseDifficulty.Hard;

    case 'oni':
    case '3':
      return CourseDifficulty.Oni;

    case 'edit':
    case 'ura':
    case '4':
      return CourseDifficulty.Edit;
  }
  return null;
}

enum StyleType {
  Single = 1,
  Double = 2,
}

function parseStyleValue(styleValue) {
  const intValue = Number.parseInt(styleValue, 10);
  if (!isNaN(intValue) && intValue >= 1) {
    return intValue;
  }
  switch (styleValue.toLowerCase()) {
    case 'single':
      return StyleType.Single;

    case 'couple':
    case 'double':
      return StyleType.Double;
  }
  return null;
}

export enum NoteType {
  Blank = 'blank',
  Don = 'don',
  Kat = 'kat',
  DonBig = 'donBig',
  KatBig = 'katBig',
  Kadon = 'kadon',
  Renda = 'renda',
  RendaBig = 'rendaBig',
  Balloon = 'balloon',
  BalloonEx = 'balloonEx',
  Fuse = 'fuse',
  End = 'end',
  EndForced = 'endForced',
  Adlib = 'adlib',
  Mine = 'mine',
  Hakushu = 'hakushu', // H: bongo clap applause
  RendaLeft = 'rendaLeft', // I: bongo yellow/left roll
  Unknown = 'unknown',
}

const NOTE_SYMBOL_REG_EXP = /[0-9A-Z]/;
function noteSymbolToNoteType(noteSymbol) {
  switch (noteSymbol) {
    case '0':
      return NoteType.Blank;

    case '1':
      return NoteType.Don;

    case '2':
      return NoteType.Kat;

    case '3':
    case 'A':
      return NoteType.DonBig;

    case '4':
    case 'B':
      return NoteType.KatBig;

    case '5':
      return NoteType.Renda;

    case '6':
      return NoteType.RendaBig;

    case '7':
      return NoteType.Balloon;

    case '8':
      return NoteType.End;

    case '9':
      return NoteType.BalloonEx;

    case 'C':
      return NoteType.Mine;

    case 'D':
      return NoteType.Fuse;

    case 'F':
      return NoteType.Adlib;

    case 'G':
      return NoteType.Kadon;
  }
  return noteSymbol.match(NOTE_SYMBOL_REG_EXP) ? NoteType.Unknown : null;
}

export enum HandType {
  Hand = 'hand',
  HandBig = 'handBig',
}

function noteSymbolToHandType(noteSymbol) {
  switch (noteSymbol) {
    case 'A':
    case 'B':
      return HandType.HandBig;
  }
  return null;
}

export function isRollType(noteType) {
  switch (noteType) {
    case NoteType.Renda:
    case NoteType.RendaBig:
    case NoteType.Balloon:
    case NoteType.BalloonEx:
    case NoteType.Fuse:
    case NoteType.Hakushu:
    case NoteType.RendaLeft:
      return true;

    default:
      return false;
  }
}

export function isBalloonType(noteType) {
  switch (noteType) {
    case NoteType.Balloon:
    case NoteType.BalloonEx:
    case NoteType.Fuse:
      return true;

    default:
      return false;
  }
}

enum BalloonType {
  All = 0,
  PerBranch = 1,
}

type BalloonBranch = BranchType | 'all';

function getNotes(data, rollStates, balloon, midx, currentBranch) {
  const notes = [];
  data = data.replaceAll(/\s+/g, '');
  notes.nDivisions = data.length || 1;
  for (let d = 0, dSkip = 0; d < data.length; ++d) {
    const ch = data.charAt(d);

    const note = {
      symbol: ch,
      type: noteSymbolToNoteType(ch),
      handType: noteSymbolToHandType(ch),
      position: d - dSkip,
    };
    if (note.type === null) {
      // TODO: emit unrecognized note symbol (ignored) warning
      --notes.nDivisions;
      ++dSkip;
      continue;
    }
    if (note.type === NoteType.Unknown) {
      // TODO: emit unknown note type warning
    }

    if (isRollType(note.type)) {
      if (rollStates.roll[currentBranch] !== null) {
        continue;
      }
      rollStates.roll[currentBranch] = {
        note,
        midx,
        didx: notes.length,
      };

      if (isBalloonType(note.type)) {
        const balloonBranch: BalloonBranch =
          balloon.type === BalloonType.All ? 'all' : currentBranch;
        note.count =
          balloon[balloonBranch][rollStates.balloonOffset[balloonBranch]++];
        if (note.count === undefined) {
          note.count = 0;
        }
      }
    } else if (
      note.type !== NoteType.Blank
      && rollStates.roll[currentBranch] !== null
    ) {
      const noteEnd = {
        symbol: note.type === NoteType.End ? ch : null,
        type: note.type === NoteType.End ? NoteType.End : NoteType.EndForced,
        position: d - dSkip,
        start: rollStates.roll[currentBranch],
      };
      rollStates.roll[currentBranch].note.end = {
        note: noteEnd,
        midx,
        didx: notes.length,
      };
      notes.push(noteEnd);
      rollStates.roll[currentBranch] = null;
    }

    if (note.type !== NoteType.Blank && note.type !== NoteType.End) {
      notes.push(note);
    }
  }
  return notes;
}

enum LineType {
  Header = 'header',
  Command = 'command',
  Data = 'data',
  Unknown = 'unknown',
}

enum HeaderScope {
  Global = 'global',
  Course = 'course',
}

const LINE_COMMENT_REG_EXP = /\/\/.*/;
const HEADER_REG_EXP = /^(\.?[A-Z0-9_]+):(.*)/i;
const COMMAND_REG_EXP = /^#([A-Z]+)\s?(.*)/i;
const DATA_REG_EXP = /^[0-9A-Z,]/;
function parseLine(line) {
  // const HeaderGlobal = [
  //   'TITLE',
  //   'SUBTITLE',
  //   'BPM',
  //   'WAVE',
  //   'OFFSET',
  //   'DEMOSTART',
  //   'GENRE',
  //   'MAKER',
  //   'FONT',
  //   'SPROLL',
  //   'LEVELCOLOR',
  //   'LEVELURA',
  //   'TITLECOLOR',
  // ];

  const HeaderCourse = [
    'COURSE',
    'STYLE',
    'LEVEL',
    'BALLOON',
    'BALLOONNOR',
    'BALLOONEXP',
    'BALLOONMAS',
    'SCOREINIT',
    'SCOREDIFF',
    'NOTESDESIGNER0',
    'NOTESDESIGNER1',
    'NOTESDESIGNER2',
    'NOTESDESIGNER3',
    'NOTESDESIGNER4',
    'TTROWBEAT',
  ];

  // const Command = [
  //   'START',
  //   'END',
  //   'GOGOSTART',
  //   'GOGOEND',
  //   'MEASURE',
  //   'SCROLL',
  //   'BPMCHANGE',
  //   'DELAY',
  //   'BRANCHSTART',
  //   'BRANCHEND',
  //   'SECTION',
  //   'N',
  //   'E',
  //   'M',
  //   'LEVELHOLD',
  //   'BMSCROLL',
  //   'HBSCROLL',
  //   'BARLINEOFF',
  //   'BARLINEON',

  //   'TTBREAK',
  //   'NEWLINE',
  //   'MOVEEVENT',
  //   'COUNTCHANGE',
  //   'AVOIDTEXTOFF',
  //   'AVOIDTEXTON',
  //   'MOVELINE',
  // ];

  let match;

  // comment
  line = line.trimStart();
  function trimComment(str) {
    return str.replace(LINE_COMMENT_REG_EXP, '').trim();
  }
  if (trimComment(line) === '') {
    return null;
  }

  // header
  match = line.match(HEADER_REG_EXP);
  if (match) {
    // . for simulator-exclusive headers, _ for i18n headers
    const nameUpper = match[1].toUpperCase();
    const value = match[2];

    return {
      type: LineType.Header,
      scope: HeaderCourse.includes(nameUpper)
        ? HeaderScope.Course
        : HeaderScope.Global,
      name: nameUpper,
      value: trimComment(value),
      valueRaw: value, // for TITLE:, SUBTITLE:, etc., in TaikoJiro
    };
  }
  // command
  match = line.match(COMMAND_REG_EXP);
  if (match) {
    // missing space is recognized in TaikoJiro
    const nameUpper = match[1].toUpperCase();
    const value = match[2];

    return {
      type: LineType.Command,
      name: nameUpper,
      value: trimComment(value),
      valueRaw: value, // for #LYRIC, etc.
    };
  }
  // data
  if (line.match(DATA_REG_EXP)) {
    // loose pattern to prevent dropping note data with unknown note symbols
    return {
      type: LineType.Data,
      data: trimComment(line),
    };
  }

  return {
    type: LineType.Unknown,
    value: line,
  };
}

export enum BranchType {
  N = 'N',
  E = 'E',
  M = 'M',
}

export enum EventType {
  Bpm = 'bpm',
  Delay = 'delay',
  GogoStart = 'gogoStart',
  GogoEnd = 'gogoEnd',
  Scroll = 'scroll',
  BranchStart = 'branchStart',
  BranchEnd = 'branchEnd',
  Barlineon = 'barlineon',
  Barlineoff = 'barlineoff',
  MoveEvent = 'moveEvent',
  CountChange = 'countChange',
  Avoidtexton = 'avoidtexton',
  Avoidtextoff = 'avoidtextoff',
  Section = 'section',
  TtBreak = 'ttBreak',
  MoveLine = 'moveLine',
}

const BALLOON_SEPARATOR_REG_EXP = /[^0-9]/;
const START_PLAYER_REG_EXP = /P(\d+)/;
const TRAILING_COMMA_REG_EXP = /,$/;
function getCourse(tjaHeaders, lines) {
  const defaultCourseHeaders = tjaHeaders.courseHeaders[undefined];
  const latestCourseHeaders = tjaHeaders.latestCourseHeaders;
  let courseHeaders = tjaHeaders.courseHeaders[latestCourseHeaders.course];
  const headers = {};

  function setHeaderValue(header, value) {
    latestCourseHeaders[header] =
      courseHeaders[header] =
      headers[header] =
        value;
  }

  function setHeaderBalloon(branch, value) {
    if (headers.balloon === undefined) {
      headers.balloon = {
        [BranchType.N]: [],
        [BranchType.E]: [],
        [BranchType.M]: [],
        'all': [],
        type: BalloonType.All,
      };
    }
    headers.balloon[branch] = value;
    switch (branch) {
      case BranchType.N:
      case BranchType.E:
      case BranchType.M:
        headers.balloon.type = BalloonType.PerBranch;
    }
  }

  function deepCopyBalloonData(data) {
    const res = {
      ...data,
    };
    for (const branch of [
      BranchType.N,
      BranchType.E,
      BranchType.M,
      'all',
    ]) {
      res[branch] = [
        ...res[branch],
      ];
    }
    return res;
  }

  function initBalloonHeader() {
    if (headers.balloon !== undefined) {
      latestCourseHeaders.balloon = courseHeaders.balloon = deepCopyBalloonData(
        headers.balloon,
      );
      return;
    }
    if (courseHeaders.balloon !== undefined) {
      headers.balloon = deepCopyBalloonData(courseHeaders.balloon);
      return;
    }
    if (latestCourseHeaders.balloon !== undefined) {
      // TODO: warn apparent cross-course header fallback
      // No cross-course header fallbacks
    }
    headers.balloon = deepCopyBalloonData(defaultCourseHeaders.balloon);
  }

  const measures = [];

  // Process lines
  let hasStarted = false;
  let measureData = '';
  let currentBranch = BranchType.N;
  let branching = false;
  let midxBranchPoint = 0;
  let nBranchMeasures = 0;
  let nBranchMeasuresMax = 0;
  const rollStates = {
    balloonOffset: {
      [BranchType.N]: 0,
      [BranchType.E]: 0,
      [BranchType.M]: 0,
      'all': 0,
    },
    roll: {
      [BranchType.N]: null,
      [BranchType.E]: null,
      [BranchType.M]: null,
    },
  };

  function addEventAt(measure, name, value) {
    measure.events.push({
      name,
      position: measureData.length,
      value,
      branch: currentBranch,
      branching,
    });
  }

  function getMeasure(midx) {
    while (midx >= measures.length) {
      const measure = {
        length: null,
        lengthNotes: null,
        properties: {},
        data: {
          [BranchType.N]: null,
          [BranchType.E]: null,
          [BranchType.M]: null,
        },
        events: [],
        nDivisions: 1,
        dataBranches: [],
        branching,
      };
      measures.push(measure);
    }
    return measures[midx];
  }

  function pushMeasure() {
    const midx = midxBranchPoint + nBranchMeasures++;
    getMeasure(midx).data[currentBranch] = getNotes(
      measureData,
      rollStates,
      headers.balloon,
      midx,
      currentBranch,
    );
    measureData = '';
  }

  for (const line of lines) {
    let balloons;
    if (line.type === LineType.Header) {
      switch (line.name) {
        case 'COURSE': {
          const course = parseCourseValue(line.value);
          if (course !== null) {
            // switch parsed course
            if (tjaHeaders.courseHeaders[course] === undefined) {
              courseHeaders = tjaHeaders.courseHeaders[course] = {};
            }
            setHeaderValue('course', course);
          }
          break;
        }

        case 'STYLE': {
          const style = parseStyleValue(line.value);
          if (style !== null) {
            setHeaderValue('style', style);
          }
          break;
        }

        case 'LEVEL':
          if (line.value !== null) {
            setHeaderValue('level', line.value);
          }
          break;

        case 'BALLOON':
          if (hasStarted) {
            // TODO: warn post-#START BALLOON commands
            break;
          }
          balloons = line.value
            .split(BALLOON_SEPARATOR_REG_EXP)
            .filter((b) => b !== '')
            .map((b) => Number.parseInt(b, 10));
          setHeaderBalloon('all', balloons);
          break;

        case 'BALLOONNOR':
          if (hasStarted) {
            // TODO: warn post-#START BALLOON commands
            break;
          }
          balloons = line.value
            .split(BALLOON_SEPARATOR_REG_EXP)
            .filter((b) => b !== '')
            .map((b) => Number.parseInt(b, 10));
          setHeaderBalloon(BranchType.N, balloons);
          break;

        case 'BALLOONEXP':
          if (hasStarted) {
            // TODO: warn post-#START BALLOON commands
            break;
          }
          balloons = line.value
            .split(BALLOON_SEPARATOR_REG_EXP)
            .filter((b) => b !== '')
            .map((b) => Number.parseInt(b, 10));
          setHeaderBalloon(BranchType.E, balloons);
          break;

        case 'BALLOONMAS':
          if (hasStarted) {
            // TODO: warn post-#START BALLOON commands
            break;
          }
          balloons = line.value
            .split(BALLOON_SEPARATOR_REG_EXP)
            .filter((b) => b !== '')
            .map((b) => Number.parseInt(b, 10));
          setHeaderBalloon(BranchType.M, balloons);
          break;

        case 'SCOREINIT': {
          const inits = line.value
            .split(BALLOON_SEPARATOR_REG_EXP)
            .filter((b) => b !== '')
            .map((b) => Number.parseInt(b, 10));

          setHeaderValue('scoreInit', inits.length >= 1 ? inits[0] : 0);
          setHeaderValue('scoreShin', inits.length >= 2 ? inits[1] : null);
          //headers.scoreInit = parseInt(line.value, 10);
          break;
        }

        case 'SCOREDIFF':
          setHeaderValue(
            'scoreDiff',
            line.value === '' ? 0 : Number.parseInt(line.value, 10),
          );
          break;

        case 'NOTESDESIGNER0':
        case 'NOTESDESIGNER1':
        case 'NOTESDESIGNER2':
        case 'NOTESDESIGNER3':
        case 'NOTESDESIGNER4':
          setHeaderValue('maker', line.valueRaw); // TODO: emit warning when value !== valueRaw
          break;

        case 'TTROWBEAT': {
          const ttRowBeat = Number.parseFloat(line.value);
          if (ttRowBeat >= 1) {
            setHeaderValue('ttRowBeat', ttRowBeat);
          }
          break;
        }
      }
    } else if (line.type === LineType.Command) {
      if (!hasStarted && line.name !== 'END') {
        hasStarted = true;
        initBalloonHeader();
      }
      let currentMeasure = getMeasure(midxBranchPoint + nBranchMeasures);
      function addEvent(name, value) {
        addEventAt(currentMeasure, name, value);
      }
      switch (line.name) {
        case 'BRANCHSTART':
          /*
                    if (flagLevelhold) {
                        break;
                    }
                    let values = line.value.split(',');
                    if (values[0] === 'r') {
                        if (values.length >= 3) targetBranch = 'M';
                        else if (values.length === 2) targetBranch = 'E';
                        else targetBranch = 'N';
                    }
                    else if (values[0] === 'p') {
                        if (values.length >= 3 && parseFloat(values[2]) <= 100) targetBranch = 'M';
                        else if (values.length >= 2 && parseFloat(values[1]) <= 100) targetBranch = 'E';
                        else targetBranch = 'N';
                    }
					*/
          branching = true;
          currentBranch = BranchType.N;
          if (nBranchMeasures > nBranchMeasuresMax) {
            nBranchMeasuresMax = nBranchMeasures;
          }
          midxBranchPoint += nBranchMeasuresMax;
          nBranchMeasuresMax = nBranchMeasures = 0;

          currentMeasure = getMeasure(midxBranchPoint);
          addEvent(EventType.BranchStart);
          break;

        case 'BRANCHEND':
          branching = false;
          currentBranch = BranchType.N;
          if (nBranchMeasures > nBranchMeasuresMax) {
            nBranchMeasuresMax = nBranchMeasures;
          }
          midxBranchPoint += nBranchMeasuresMax;
          nBranchMeasuresMax = nBranchMeasures = 0;

          currentMeasure = getMeasure(midxBranchPoint);
          addEvent(EventType.BranchEnd);
          break;

        case 'N':
        case 'E':
        case 'M':
          currentBranch = line.name;
          if (branching) {
            if (nBranchMeasures > nBranchMeasuresMax) {
              nBranchMeasuresMax = nBranchMeasures;
            }
            nBranchMeasures = 0;
            currentMeasure = getMeasure(midxBranchPoint);
          }
          break;

        case 'START': {
          const matchStartPlayer = line.value.match(START_PLAYER_REG_EXP);
          if (matchStartPlayer) {
            const startPlayer = Number.parseInt(matchStartPlayer[1], 10);
            if (startPlayer > 0) {
              headers.startPlayer = startPlayer; // not a header but stored as such
            }
          }
          break;
        }

        case 'END':
          hasStarted = false;
          break;

        default:
          switch (line.name) {
            case 'MEASURE': {
              const divs = line.value
                .replace(TRAILING_COMMA_REG_EXP, '')
                .split(',');
              if (divs.length === 0 || divs.length > 2) {
                break;
              }

              const div = divs[0].split('/').map((s) => s.trim());
              if (
                !(
                  div.length === 2
                  && div[0]
                  && !isNaN(div[0])
                  && div[1]
                  && !isNaN(div[1])
                )
              ) {
                break;
              }
              const measureDividend = Number.parseFloat(div[0], 10);
              const measureDivisor = Number.parseFloat(div[1], 10);
              if (!isFinite(measureDividend / measureDivisor)) {
                break;
              }

              let measureDividendNotes;
              let measureDivisorNotes;
              if (divs[1] === undefined) {
                measureDividendNotes = measureDividend;
                measureDivisorNotes = measureDivisor;
              } else {
                const divNote = divs[1].split('/').map((s) => s.trim());
                if (
                  !(
                    divNote.length === 2
                    && divNote[0]
                    && !isNaN(divNote[0])
                    && divNote[1]
                    && !isNaN(divNote[1])
                  )
                ) {
                  break;
                }
                measureDividendNotes = Number.parseFloat(divNote[0], 10);
                measureDivisorNotes = Number.parseFloat(divNote[1], 10);
                if (!isFinite(measureDividendNotes / measureDivisorNotes)) {
                  break;
                }
              }

              currentMeasure.length = [
                measureDividend,
                measureDivisor,
              ];
              currentMeasure.lengthNotes = [
                measureDividendNotes,
                measureDivisorNotes,
              ];
              break;
            }

            case 'GOGOSTART':
              addEvent(EventType.GogoStart);
              break;

            case 'GOGOEND':
              addEvent(EventType.GogoEnd);
              break;

            case 'BARLINEON':
              addEvent(EventType.Barlineon);
              break;

            case 'BARLINEOFF':
              addEvent(EventType.Barlineoff);
              break;

            case 'SCROLL':
              addEvent(EventType.Scroll, line.value);
              break;

            case 'BPMCHANGE':
              addEvent(EventType.Bpm, line.value);
              break;

            case 'MOVEEVENT':
              addEvent(EventType.MoveEvent, Number.parseInt(line.value, 10));
              break;

            case 'COUNTCHANGE':
              addEvent(EventType.CountChange, Number.parseInt(line.value, 10));
              break;

            case 'AVOIDTEXTON':
              addEvent(EventType.Avoidtexton);
              break;

            case 'AVOIDTEXTOFF':
              addEvent(EventType.Avoidtextoff);
              break;

            case 'DELAY':
              addEvent(EventType.Delay, Number.parseFloat(line.value));
              break;

            case 'SECTION':
              addEvent(EventType.Section);
              break;

            case 'MOVELINE':
              addEvent(EventType.MoveLine, Number.parseInt(line.value, 10));
              break;

            case 'TTBREAK':
            case 'NEWLINE':
              addEvent(EventType.TtBreak);
              break;

            /*
            case 'LEVELHOLD':
                flagLevelhold = true;
						*/
          }
      }
    }
    //else if (line.type === 'data' && currentBranch === targetBranch) {
    else if (line.type === LineType.Data) {
      if (!hasStarted) {
        hasStarted = true;
        initBalloonHeader();
      }
      const data = line.data;
      const measures = data.split(',');
      for (let i = 0; i < measures.length - 1; ++i) {
        measureData += measures[i];
        pushMeasure();
      }
      measureData += measures[measures.length - 1];
    }
  }

  // handle notes past the last `,`
  if (measureData) {
    pushMeasure();
  }

  for (const bt of [
    BranchType.N,
    BranchType.E,
    BranchType.M,
  ]) {
    if (rollStates.roll[bt] !== null) {
      // TODO: warn unended roll
    }
  }

  if (measures.length) {
    // Make first BPM event
    let firstBpmEventFound = false;

    for (const evt of measures[0].events) {
      if (evt.name === 'bpm' && evt.position === 0) {
        firstBpmEventFound = true;
        break;
      }
    }

    if (!firstBpmEventFound) {
      measures[0].events.unshift({
        name: EventType.Bpm,
        position: 0,
        value: tjaHeaders.bpm,
      });
    }
  }

  // After
  for (let i = 0; i < measures.length; i++) {
    // Calculate MEASURE progressively in case some measures were skipped
    if (measures[i].length === null) {
      measures[i].length =
        i > 0
          ? measures[i - 1].length
          : [
              4,
              4,
            ];
    }
    if (measures[i].lengthNotes === null) {
      measures[i].lengthNotes =
        i > 0
          ? measures[i - 1].lengthNotes
          : [
              4,
              4,
            ];
    }

    // Add Zero
    const lengths = [];
    const branchs = [
      BranchType.N,
      BranchType.E,
      BranchType.M,
    ];

    for (const b of branchs) {
      if (measures[i].data[b] != null) {
        lengths.push(measures[i].data[b].nDivisions);
        measures[i].dataBranches.push(b);
      }
    }

    const fixedMax = arrayLcm(lengths);
    measures[i].nDivisions = fixedMax;

    for (const event of measures[i].events) {
      if (measures[i].data[event.branch] != null) {
        const rate = fixedMax / measures[i].data[event.branch].nDivisions;
        event.position *= rate;
      }
    }

    for (const b of branchs) {
      if (measures[i].data[b] != null) {
        addZero(measures[i].data[b], fixedMax);
      }
    }

    // Merge HS Event + build row layout property
    measures[i].properties.ttBreaks = [];
    measures[i].properties.moveLines = [];
    const canDelete = [];
    const posToScroll = {};
    for (let j = 0; j < measures[i].events.length; j++) {
      const event = measures[i].events[j];
      if (event.name === EventType.Scroll) {
        const value = event.value;
        let lastScroll = posToScroll[event.position];
        if (lastScroll === undefined) {
          lastScroll = posToScroll[event.position] = event;
          event.value = {};
          for (const bt of measures[i].dataBranches) {
            event.value[bt] = null;
          }
        } else {
          canDelete.push(j);
        }
        for (const bt of event.branching
          ? [
              event.branch,
            ]
          : measures[i].dataBranches) {
          lastScroll.value[bt] = value;
        }
      } else if (event.name === EventType.TtBreak) {
        measures[i].properties.ttBreaks.push(event);
      } else if (event.name === EventType.MoveLine) {
        measures[i].properties.moveLines.push(event);
      }
    }
    measures[i].properties.ttBreaks.sort((a, b) => a.position - b.position);
    measures[i].properties.moveLines.sort((a, b) => a.position - b.position);

    for (const cd of canDelete.reverse()) {
      measures[i].events.splice(cd, 1);
    }

    // Recalculate branching state
    for (const pos in posToScroll) {
      const event = posToScroll[pos];
      let value;
      event.branching = false;
      for (const bt in event.value) {
        if (value !== undefined && event.value[bt] !== value) {
          event.branching = true;
          break;
        }
        value = event.value[bt];
      }
    }
  }

  // handle events past the last `,` without notes
  if (measures.length !== 0) {
    const measure = measures[measures.length - 1];
    if (measure.dataBranches.length === 0) {
      if (measure.events.length === 0) {
        // no events; can simply remove
        measures.pop();
      } else if (measures.length > 1) {
        // move to the back of the previous measure
        measures.pop();
        const lastMeasure = measures[measures.length - 1];
        for (const event of measure.events) {
          event.position = lastMeasure.nDivisions;
          lastMeasure.events.push(event);
        }
      } else {
        // add blank measure data
        measure.data[BranchType.N] = getNotes(''); // other arguments unused
      }
    }
  }

  // Output
  //console.log(measures[measures.length - 1])

  if (!hasStarted) {
    initBalloonHeader();
  }

  // handle header value fallbacks
  for (const header in defaultCourseHeaders) {
    if (header === 'balloon') {
      continue;
    }
    if (headers[header] !== undefined) {
      continue;
    }
    if (courseHeaders[header] !== undefined) {
      headers[header] = courseHeaders[header];
      continue;
    }
    if (latestCourseHeaders[header] !== undefined) {
      // TODO: warn apparent cross-course header fallback
      // No cross-course header fallbacks
    }
    headers[header] = defaultCourseHeaders[header];
  }

  return {
    headers,
    measures,
  };
}

const NEW_LINE_REG_EXP = /(\r\n|\r|\n)/;
const SUBTITLE_MODIFIER_PREFIX_REG_EXP = /^(\+\+|--)/;
export function parseTja(tja) {
  // Split by lines
  const lines = tja.split(NEW_LINE_REG_EXP).map((line) => line.trim());

  const headers = {
    // global-fineness headers
    title: '',
    subtitle: '',
    bpm: 120,
    wave: '',
    offset: 0,
    demoStart: 0,
    genre: '',
    maker: null,
    font: 'donscore',
    spRoll: 'kusudama',
    levelColor: 0,
    levelUra: 0,
    titleColor: 0,

    // local-fineness headers
    courseHeaders: [],
    latestCourseHeaders: {},
  };

  // for initial parsed course-fineness headers
  headers.courseHeaders[undefined] = {
    course: 3,
    style: 1,
    startPlayer: 1,
    level: 0,
    balloon: {
      [BranchType.N]: [],
      [BranchType.E]: [],
      [BranchType.M]: [],
      'all': [],
      type: BalloonType.All,
    },
    scoreInit: 0,
    scoreDiff: 0,
    scoreShin: null,
    maker: null,
    ttRowBeat: 16,
  };

  const courses = [];

  // Line by line
  let idx;
  let courseLines = [];

  // parse states
  let hasStarted = false;
  let hasData = false;

  function pushCourse() {
    if (courseLines.length) {
      if (!hasStarted) {
        // TODO: emit straying-#END warning
      }
      hasStarted = false;

      // process anyway to update global headers
      const course = getCourse(headers, courseLines);

      if (hasData) {
        hasData = false;
        courses.push(course);
      }
      courseLines = [];
    }
  }

  for (idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const parsed = parseLine(line);
    if (parsed === null) {
      continue;
    }

    if (
      parsed.type === LineType.Header
      && parsed.scope === HeaderScope.Global
    ) {
      switch (parsed.name) {
        case 'TITLE':
          headers.title = parsed.valueRaw; // TODO: emit warning when value !== valueRaw
          break;

        case 'SUBTITLE':
          headers.subtitle = parsed.valueRaw.replace(
            SUBTITLE_MODIFIER_PREFIX_REG_EXP,
            '',
          ); // TODO: emit warning when value !== valueRaw
          break;

        case 'BPM':
          headers.bpm = parsed.value;
          break;

        case 'WAVE':
          headers.wave = parsed.value;
          break;

        case 'OFFSET':
          headers.offset = Number.parseFloat(parsed.value);
          break;

        case 'DEMOSTART':
          headers.demoStart = Number.parseFloat(parsed.value);
          break;

        case 'GENRE':
          headers.genre = parsed.valueRaw; // TODO: emit warning when value !== valueRaw
          break;

        case 'MAKER':
          headers.maker = parsed.valueRaw; // TODO: emit warning when value !== valueRaw
          break;

        case 'FONT':
          headers.font = parsed.value;
          break;

        case 'SPROLL':
          headers.spRoll = parsed.value.toLowerCase();
          break;

        case 'LEVELCOLOR':
          headers.levelColor = Number.parseInt(parsed.value, 10);
          if (isNaN(headers.levelColor)) {
            headers.levelColor = 0;
          }
          break;

        case 'LEVELURA':
          headers.levelUra = Number.parseInt(parsed.value, 10);
          if (isNaN(headers.levelUra)) {
            headers.levelUra = 0;
          }
          break;

        case 'TITLECOLOR':
          headers.titleColor = Number.parseInt(parsed.value, 10);
          if (isNaN(headers.titleColor)) {
            headers.titleColor = 0;
          }
          break;
      }
    } else if (
      parsed.type === LineType.Header
      && parsed.scope === HeaderScope.Course
    ) {
      if ((parsed.name === 'COURSE' || parsed.name === 'STYLE') && hasStarted) {
        // TODO: emit missing-#END warning
        pushCourse();
        hasStarted = false;
      }
      courseLines.push(parsed);
    } else if (parsed.type === LineType.Command) {
      if (parsed.name === 'START') {
        hasStarted = true;
      }
      courseLines.push(parsed);

      if (parsed.name === 'END') {
        pushCourse();
      }
    } else if (parsed.type === LineType.Data) {
      if (!hasStarted) {
        if (!parsed.data.match(DATA_REG_EXP)) {
          // likely an incomplete header
          continue; // TODO: emit incomplete header warning
        }
        // TODO: emit missing-#START warning
        hasStarted = true;
      }
      courseLines.push(parsed);
      hasData = true;
    }
  }

  pushCourse();

  // Return
  console.log(courses);
  return {
    headers,
    courses,
  };
}

export function getCourseLines(tja, chart, courseId) {
  const result = [];
  const course = chart.courses[courseId];
  const courseTarget = course.headers.course;
  const styleTarget = course.headers.style;

  let courseValue;
  const styleValues = [];
  styleValues[undefined] = 1;

  const getWriteHeader = () =>
    courseValue === undefined || courseValue === courseTarget;
  const getWriteData = () =>
    (courseValue === undefined ? 3 : courseValue) === courseTarget
    && styleValues[courseValue] === styleTarget;

  let writeHeader = getWriteHeader();
  let writeData = getWriteHeader();

  const lines = tja.split(NEW_LINE_REG_EXP);

  for (const line of lines) {
    const parsed = parseLine(line);
    if (parsed === null) {
      continue;
    }

    if (
      parsed.type === LineType.Header
      && parsed.scope === HeaderScope.Global
    ) {
      result.push(line);
    } else if (
      parsed.type === LineType.Header
      && parsed.scope === HeaderScope.Course
    ) {
      if (parsed.name === 'COURSE') {
        const value = parseCourseValue(parsed.value);
        if (value !== null) {
          courseValue = value;
          if (styleValues[courseValue] === undefined) {
            styleValues[courseValue] = styleValues[undefined];
          }
          writeHeader = getWriteHeader();
          writeData = getWriteData();
        }
      } else if (parsed.name === 'STYLE') {
        const value = parseStyleValue(parsed.value);
        if (value !== null) {
          styleValues[courseValue] = value;
          writeData = getWriteData();
        }
      }
      if (writeHeader) {
        result.push(line);
      }
    } else if (parsed.type === LineType.Command) {
      if (writeData) {
        result.push(line);
      }
    } else if (parsed.type === LineType.Data && writeData) {
      result.push(line);
    }
  }

  return result.join('\n');
}

export function getEnabledBranch(chart, courseId) {
  const branchTypes = [
    BranchType.N,
    BranchType.E,
    BranchType.M,
  ];
  const result = [];
  const course = chart.courses[courseId];
  if (course === undefined) {
    return result;
  }

  for (const bt of branchTypes) {
    for (const m of course.measures) {
      if (m.branching && m.data[bt] != null) {
        result.push(bt);
        break;
      }
    }
  }

  return result;
}
