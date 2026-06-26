// @ts-nocheck

export function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

export function lcm(a, b) {
  return (a * b) / gcd(a, b);
}

export function arrayLCM(arr) {
  let result = arr[0];
  for (let i = 1; i < arr.length; i++) {
    result = lcm(result, arr[i]);
  }
  return result;
}

export function addZero(notes, max) {
  const rate = Math.trunc(max / notes.nDivisions);
  if (rate > 1) {
    notes.nDivisions *= rate;
    for (const note of notes) {
      note.position *= rate;
    }
  }
}

/*
export function convertPngIndexed(dataUrl) {
	const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
	const buffer = Buffer.from(base64Data, 'base64');

	let img = sharp(buffer);
	const indexedBuffer = img.png({palette:true}).toBuffer();
	const indexedBase64Data = indexedBuffer.toString('base64');
	const indexedDataUrl = `data:image/png;base64,${indexedBase64Data}`;

	return indexedDataUrl;
}
*/

export function bsearchLeftmost(keyfunc, max, target) {
  let l = 0;
  let r = max;
  while (l < r) {
    const m = l + Math.floor((r - l) / 2);
    if (keyfunc(m) < target) {
      l = m + 1;
    } else {
      r = m;
    }
  }
  return l;
}
