// @ts-nocheck

import { addZero, arrayLcm, lcm } from './common';
import { compareArray } from './drawChart';
import {
  BranchType,
  EventType,
  isBalloonType,
  isRollType,
  NoteType,
} from './parseTJA';

const aryMax = (a, b) => Math.max(a, b);

export enum SpRoll {
  Kusudama = 'kusudama',
  Denden = 'denden',
  Suzudon = 'suzudon',
  Potato = 'potato',
}

enum SpChar {
  Kusudama = 'k',
  Denden = 'd',
  Suzudon = 'b',
  Potato = 'p',
}

export function convertToDonscore(chart, courseId) {
  const result = [];
  const course = chart.courses[courseId];
  const branchTypes = [
    BranchType.N,
    BranchType.E,
    BranchType.M,
  ];
  let spSymbol = SpChar.Kusudama;

  // Set SpRoll Symbol
  switch (chart.headers.spRoll) {
    case SpRoll.Denden:
      spSymbol = SpChar.Denden;
      break;
    case SpRoll.Suzudon:
      spSymbol = SpChar.Suzudon;
      break;
    case SpRoll.Potato:
      spSymbol = SpChar.Potato;
      break;
  }

  // Create Events Copy
  const newEvent = [];
  for (const measure of course.measures) {
    const tempEvent = [];
    for (const event of measure.events) {
      tempEvent.push({
        name: event.name,
        position: event.position,
        value: event.value,
      });
    }
    newEvent.push(tempEvent);
  }

  // Align to 48th
  const newData = [];
  for (const measure of course.measures) {
    const tempData = {
      [BranchType.N]: null,
      [BranchType.E]: null,
      [BranchType.M]: null,
    };

    for (const bt of branchTypes) {
      if (measure.data[bt] === null) {
        continue;
      }

      const fixed48th = Math.abs((48 / measure.length[1]) * measure.length[0]);
      tempData[bt] = [];
      Object.assign(tempData[bt], measure.data[bt]); // shallow array copy to modify nDivisions
      for (let j = 0; j < tempData[bt].length; ++j) {
        tempData[bt][j] = {
          ...tempData[bt][j],
        }; // shallow copy to modify position
      }
      if (
        fixed48th > tempData[bt].nDivisions
        && fixed48th % tempData[bt].nDivisions === 0
      ) {
        addZero(tempData[bt], fixed48th);
      }
    }
    newData.push(tempData);
  }

  // Add for Roll
  for (const bt of branchTypes) {
    for (const data of newData) {
      if (data[bt] === null) {
        continue;
      }
      let rolling = false;
      const marginDiff = [];
      let margin = -1;
      let index = -1;
      for (const note of data[bt]) {
        if (isRollType(note.type)) {
          index = note.position;
          rolling = true;

          if (isBalloonType(note.type)) {
            margin = note.count.toString().length + 2; // `[@5`
          } else {
            margin = 1; // `<`
          }
        } else if (
          note.type === NoteType.End
          || note.type === NoteType.EndForced
        ) {
          marginDiff.push(margin - (note.position - index - 1)); // `[@5` - (between `[` & `]`), or (between line start & `]`)
          rolling = false;
        }
      }

      if (rolling) {
        marginDiff.push(margin - (data[bt].nDivisions - index - 1)); // `[@5` - (between `[` & line end)
      }

      if (marginDiff.length > 0) {
        const marginMax = marginDiff.reduce(aryMax);
        if (marginMax > 0) {
          addZero(data[bt], data[bt].nDivisions * (marginMax + 1));
        }
      }
    }
  }

  for (const bt of branchTypes) {
    for (let i = 0; i < newData.length; i++) {
      if (newData[i][bt] === null) {
        continue;
      }
      const dataLcm = lcm(
        newData[i][bt].nDivisions,
        Math.ceil(Math.abs(course.measures[i].length[0])),
      );
      if (dataLcm > newData[i][bt].nDivisions) {
        addZero(newData[i][bt], dataLcm);
      }
    }
  }

  // Fix Events Position
  for (let i = 0; i < course.measures.length; i++) {
    const measure = course.measures[i];
    const lengths = [];
    for (const bt of branchTypes) {
      if (newData[i][bt] != null) {
        lengths.push(newData[i][bt].nDivisions);
      }
    }
    const fixedMax = arrayLcm(lengths);

    for (const event of newEvent[i]) {
      const rate = fixedMax / measure.nDivisions;
      event.position *= rate;
    }

    for (const bt of branchTypes) {
      if (newData[i][bt] != null) {
        addZero(newData[i][bt], fixedMax);
      }
    }
  }

  // Convert Notes
  const converted = [];
  for (const _ of newData) {
    converted.push({
      [BranchType.N]: null,
      [BranchType.E]: null,
      [BranchType.M]: null,
    });
  }
  for (const bt of branchTypes) {
    let balloonText = '';
    let endChar = '';
    let balloonTextCount = 0;
    let rolling = false;
    for (let i = 0; i < newData.length; i++) {
      if (newData[i][bt] === null) {
        continue;
      }
      const tempData = [];

      let didx = 0;
      for (let pos = 0; pos < newData[i][bt].nDivisions; ++pos) {
        const notes = [];
        while (
          didx < newData[i][bt].length
          && newData[i][bt][didx].position <= pos
        ) {
          notes.push(newData[i][bt][didx++]);
        }
        if (notes.length === 0) {
          notes.push({
            type: NoteType.Blank,
          });
        }

        for (const note of notes) {
          let balloonCount = 0;
          if (isRollType(note.type)) {
            rolling = true;
            if (isBalloonType(note.type)) {
              balloonCount = note.count;
            } else {
              balloonTextCount = 0;
            }
          } else if (
            note.type === NoteType.End
            || note.type === NoteType.EndForced
          ) {
            tempData.push(
              note.type === NoteType.End ? endChar : '\\' + endChar,
            );
            rolling = false;
            continue;
          } else if (rolling) {
            if (balloonTextCount > 0) {
              tempData.push(
                balloonText.charAt(balloonText.length - balloonTextCount--),
              );
            } else {
              tempData.push('=');
            }
            continue;
          }

          switch (note.type) {
            case NoteType.Don:
              tempData.push('o');
              break;
            case NoteType.Kat:
              tempData.push('x');
              break;
            case NoteType.DonBig:
              tempData.push('O');
              break;
            case NoteType.KatBig:
              tempData.push('X');
              break;
            case NoteType.Renda:
              tempData.push('<');
              endChar = '>';
              break;
            case NoteType.RendaBig:
              tempData.push('(');
              endChar = ')';
              break;
            case NoteType.Balloon:
            case NoteType.Fuse:
              tempData.push('[');
              endChar = ']';
              balloonText = '@' + balloonCount.toString();
              balloonTextCount = balloonText.length;
              break;
            case NoteType.BalloonEx:
              tempData.push('[');
              endChar = ']';
              balloonText = spSymbol + balloonCount.toString();
              balloonTextCount = balloonText.length;
              break;
            case NoteType.Mine:
              tempData.push('B');
              break;
            default:
              tempData.push(' ');
              break;
          }
        }
      }

      converted[i][bt] = tempData;
    }
  }

  // Fix Roll End
  const rollEndSymbol = [
    '>',
    ')',
    ']',
  ];
  for (const bt of branchTypes) {
    for (let i = 0; i < converted.length; i++) {
      if (converted[i][bt] === null) {
        continue;
      }
      for (let j = 0; j < converted[i][bt].length; j++) {
        let ch = converted[i][bt][j];
        const isForcedEnd = ch[0] === '\\';
        if (isForcedEnd) {
          ch = ch.substring(1);
        }

        if (rollEndSymbol.includes(ch) && (i > 0 || j > 0)) {
          if (j === 0) {
            converted[i][bt][j] = ' ';
            if (converted[i - 1][bt] === null) {
              // A branch X roll ends at branch point but the previous branch section has no branch X
              for (const btp of branchTypes) {
                if (converted[i - 1][btp] !== null) {
                  converted[i - 1][bt] = [
                    ...Array(converted[i - 1][btp].length),
                  ].map(() => '=');
                  break;
                }
              }
            }
            converted[i - 1][bt][converted[i - 1][bt].length - 1] = ch;
          } else {
            converted[i][bt][j] = ' ';
            converted[i][bt][j - 1] = ch;
          }
          if (isForcedEnd) {
            converted[i][bt].splice(j--, 1);
          }
        }
      }
    }
  }

  // Write Donscore
  // Header
  const titleUraSymbol = '(裏譜面)';
  const levelUraSymbol = '裏';
  const fixedTitle =
    course.headers.course === 4 && chart.headers.levelUra != 1
      ? chart.headers.title + titleUraSymbol
      : chart.headers.title;
  const difficulty = [
    'かんたん',
    'ふつう',
    'むずかしい',
    'おに',
    'おに' + (chart.headers.levelUra === 1 ? levelUraSymbol : ''),
  ];

  result.push(
    ';converted by TJA Tools <https://whmhammer.github.io/tja-tools>',
  ); // default URL to replace in GitHub action. Please keep this URL the same as the URL in the GitHub action
  result.push(`#title ${fixedTitle}`);
  result.push(`#difficulty ${difficulty[course.headers.course]}`);
  result.push(`#level ${course.headers.level}`);

  // Chart
  let preBranch = [
    BranchType.N,
  ];
  let preBeatChar = 4;
  let preMeter = [
    4,
    4,
  ];

  for (let m = 0; m < course.measures.length; m++) {
    const measure = course.measures[m];

    // Change Branch
    const nowBranch = [];
    for (const bt of branchTypes) {
      if (converted[m][bt] != null) {
        nowBranch.push(bt);
      }
    }

    // Branch Start
    let hasBranchStart = false;
    for (const event of measure.events) {
      if (event.name === EventType.BranchStart) {
        hasBranchStart = true;
        break;
      }
    }

    const diffBranches = !compareArray(preBranch, nowBranch);
    if (hasBranchStart || diffBranches) {
      let branchText = '#branch';
      if (diffBranches) {
        branchText += ' ';
        for (const bt of branchTypes) {
          branchText += nowBranch.includes(bt) ? 'o' : 'x';
        }
      }
      result.push(branchText);
    }

    // NewLine
    if (measure.properties.ttBreak) {
      result.push('#newline');
    }

    // Meter & BeatChar
    let nowMeter = [
      measure.length[1],
      measure.length[0],
    ];
    if (nowMeter[0] < 0) {
      nowMeter = nowMeter.map((x) => -x);
    }
    let nowBeatChar = converted[m][nowBranch[0]].length / measure.length[0];
    if (!isFinite(nowBeatChar)) {
      nowBeatChar = converted[m][nowBranch[0]].length;
    }
    if (!compareArray(preMeter, nowMeter)) {
      result.push(`#meter ${nowMeter[0]} ${nowMeter[1]}`);
    }
    if (preBeatChar != nowBeatChar) {
      result.push(`#beatchar ${nowBeatChar}`);
    }

    // Events
    for (const event of newEvent[m]) {
      if (isNaN(event.position)) {
        continue;
      }
      const fixedMeasure = lcm(Math.abs(measure.length[1]), 4);
      const fixedPosition =
        event.position * (fixedMeasure / Math.abs(measure.length[1]));
      const splitNum =
        (converted[m][nowBranch[0]].length / Math.abs(measure.length[0]))
        * (fixedMeasure / 4);
      let eventText = '';

      switch (event.name) {
        case EventType.GogoStart:
          eventText = '#begingogo';
          if (event.position > 0) {
            eventText += ` ${splitNum} ${fixedPosition}`;
          }
          result.push(eventText);
          break;
        case EventType.GogoEnd:
          eventText = '#endgogo';
          if (event.position > 0) {
            eventText += ` ${splitNum} ${fixedPosition}`;
          }
          result.push(eventText);
          break;
        case EventType.Barlineon:
          eventText = '#barlineon';
          if (event.position > 0) {
            eventText += ` ${splitNum} ${fixedPosition}`;
          }
          result.push(eventText);
          break;
        case EventType.Barlineoff:
          eventText = '#barlineoff';
          if (event.position > 0) {
            eventText += ` ${splitNum} ${fixedPosition}`;
          }
          result.push(eventText);
          break;
        case EventType.Bpm:
          eventText = `#bpm ${event.value}`;
          if (event.position > 0) {
            eventText += ` ${splitNum} ${fixedPosition}`;
          }
          result.push(eventText);
          break;
        case EventType.Scroll: {
          const scrollsTemp = [];
          const valueLookup = {};
          for (const bt in event.value) {
            if (event.value[bt] === null) {
              continue;
            }
            if (valueLookup[event.value[bt]] === undefined) {
              valueLookup[event.value[bt]] = {
                value: event.value[bt],
                branch: [],
              };
              scrollsTemp.push(valueLookup[event.value[bt]]);
            }
            valueLookup[event.value[bt]].branch.push(bt);
          }

          for (const sTemp of scrollsTemp) {
            let eventText = `#hs ${sTemp.value}`;
            if (event.position > 0) {
              eventText += ` ${splitNum} ${fixedPosition}`;
            }
            if (event.branching) {
              eventText += ' ';
              for (const bt of branchTypes) {
                eventText += sTemp.branch.includes(bt) ? 'o' : 'x';
              }
            }
            result.push(eventText);
          }
          break;
        }
      }
    }

    // Notes
    for (const nb of nowBranch) {
      result.push(converted[m][nb].join(''));
    }

    preBranch = nowBranch;
    preBeatChar = nowBeatChar;
    preMeter = nowMeter;
  }

  console.log(result);
  return result.join('\n');
}
