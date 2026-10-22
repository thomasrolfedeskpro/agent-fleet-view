import { Container, Graphics, Text, type TextStyleOptions } from 'pixi.js';
import { ATTENTION, FONT_STACK, INK, LINE, QUIET, RADIUS, SURFACE } from '../theme/tokens.js';
import type { CellModel, TetherModel } from './scene.js';

const PAD = 12;
const DOT_R = 5;
const PILL_H = 18;
const CHIP_H = 18;
const ROW_GAP = 6;

const font = (size: number, fill: string, weight?: 'bold'): TextStyleOptions => ({
  fontFamily: FONT_STACK,
  fontSize: size,
  fill,
  fontWeight: weight ?? 'normal',
});

export type CellView = {
  root: Container;
  frame: Graphics;
  body: Container;
  signature: string;
  pillWidth: number;
  cell: CellModel;
};

const signatureOf = (cell: CellModel): string =>
  [
    cell.label,
    cell.badges.join('·'),
    cell.count,
    cell.status,
    cell.w,
    cell.h,
    cell.hand,
    cell.handInside,
    cell.container,
  ].join('|');

export function createCellView(): CellView {
  const root = new Container();
  const frame = new Graphics();
  const body = new Container();
  root.addChild(frame, body);
  root.eventMode = 'none';
  return { root, frame, body, signature: '', pillWidth: 0, cell: emptyCell() };
}

function emptyCell(): CellModel {
  return {
    id: '',
    x: 0,
    y: 0,
    w: 0,
    h: 0,
    label: '',
    badges: [],
    status: 'idle',
    hand: false,
    count: null,
    container: false,
    handInside: false,
    selected: false,
  };
}

export function updateCellView(view: CellView, cell: CellModel, statusColor: string): void {
  view.cell = cell;
  view.root.x = cell.x;
  view.root.y = cell.y;

  const signature = signatureOf(cell);
  if (signature !== view.signature) {
    view.signature = signature;
    view.pillWidth = buildBody(view, cell);
  }
  paintFrame(view, cell, statusColor);
}

/** Redrawn every animated frame, so it holds everything carrying the status colour. */
export function paintFrame(view: CellView, cell: CellModel, statusColor: string): void {
  const g = view.frame;
  g.clear();
  g.roundRect(0, 0, cell.w, cell.h, RADIUS).fill({ color: SURFACE });
  g.roundRect(0, 0, cell.w, cell.h, RADIUS).stroke({ width: 2, color: statusColor, alignment: 1 });
  if (cell.selected) {
    g.roundRect(-3, -3, cell.w + 6, cell.h + 6, RADIUS + 3).stroke({ width: 2, color: INK });
  }

  g.circle(PAD + DOT_R, PAD + DOT_R + 2, DOT_R).fill({ color: statusColor });

  if (cell.handInside || cell.hand) {
    drawHand(g, cell.w - PAD - 7, PAD + 8, ATTENTION);
  }

  const pillY = PAD + DOT_R * 2 + ROW_GAP + 4;
  g.roundRect(PAD, pillY, view.pillWidth, PILL_H, PILL_H / 2).fill({ color: statusColor });
}

/**
 * A hand glyph drawn as geometry rather than an emoji: the mark has to stay the attention
 * colour on every platform, and a colour-emoji font would ignore the fill.
 */
function drawHand(g: Graphics, cx: number, cy: number, color: string): void {
  g.roundRect(cx - 5, cy - 1, 10, 9, 3);
  g.roundRect(cx - 4.5, cy - 8, 2.4, 9, 1.2);
  g.roundRect(cx - 1.2, cy - 9, 2.4, 10, 1.2);
  g.roundRect(cx + 2.1, cy - 7, 2.4, 8, 1.2);
  g.roundRect(cx + 4.6, cy - 2, 2.6, 6, 1.3);
  g.fill({ color });
}

function buildBody(view: CellView, cell: CellModel): number {
  for (const child of view.body.removeChildren()) child.destroy({ children: true });

  const handRoom = cell.hand || cell.handInside ? 22 : 0;
  const label = new Text({ text: cell.label, style: font(14, INK, 'bold') });
  label.x = PAD + DOT_R * 2 + ROW_GAP;
  label.y = PAD;
  truncate(label, cell.w - label.x - PAD - handRoom);
  view.body.addChild(label);

  const pillY = PAD + DOT_R * 2 + ROW_GAP + 4;
  const pillText = new Text({ text: cell.status, style: font(11, SURFACE, 'bold') });
  pillText.x = PAD + 9;
  pillText.y = pillY + (PILL_H - pillText.height) / 2;
  view.body.addChild(pillText);
  const pillWidth = pillText.width + 18;

  if (cell.count !== null) {
    const chip = chipOf(String(cell.count), INK, LINE);
    chip.x = cell.w - PAD - chip.width;
    chip.y = pillY;
    view.body.addChild(chip);
  }

  let x = PAD;
  const badgeY = cell.h - PAD - CHIP_H;
  for (const badge of cell.badges) {
    const chip = chipOf(badge, QUIET, LINE);
    if (x + chip.width > cell.w - PAD) break;
    chip.x = x;
    chip.y = badgeY;
    view.body.addChild(chip);
    x += chip.width + 6;
  }

  return pillWidth;
}

function chipOf(text: string, color: string, border: string): Container {
  const root = new Container();
  const label = new Text({ text, style: font(11, color) });
  const width = label.width + 16;
  const box = new Graphics()
    .roundRect(0, 0, width, CHIP_H, CHIP_H / 2)
    .fill({ color: SURFACE })
    .stroke({ width: 1, color: border });
  label.x = 8;
  label.y = (CHIP_H - label.height) / 2;
  root.addChild(box, label);
  return root;
}

function truncate(text: Text, max: number): void {
  if (max <= 0 || text.width <= max) return;
  let body = text.text;
  while (body.length > 1 && text.width > max) {
    body = body.slice(0, -1);
    text.text = `${body}…`;
  }
}

export function paintTethers(g: Graphics, tethers: TetherModel[]): void {
  g.clear();
  for (const tether of tethers) {
    g.moveTo(tether.x1, tether.y1).lineTo(tether.x2, tether.y2);
  }
  if (tethers.length > 0) g.stroke({ width: 2, color: LINE });
  for (const tether of tethers) {
    g.circle(tether.x1, tether.y1, 3).circle(tether.x2, tether.y2, 3);
  }
  if (tethers.length > 0) g.fill({ color: LINE });
}
