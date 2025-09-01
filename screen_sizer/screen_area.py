#!/usr/bin/env python3

import argparse
from fractions import Fraction

def video_dimensions(w, h, vw, vh):
  if vw * h > w * vh:
    ratio = vh / h * w / vw
    video_diag = ((ratio * h) ** 2 + w ** 2) ** 0.5
  else:
    ratio = vw / w * h / vh
    video_diag = ((ratio * w) ** 2 + h ** 2) ** 0.5
  return w * h * ratio, video_diag

def normalize(diag, w, h):
  denominator = (w * w + h * h) ** 0.5
  w_actual = w * diag / denominator
  h_actual = h * diag / denominator
  return (w_actual, h_actual)

if __name__ == "__main__":
  parser = argparse.ArgumentParser()

  parser.add_argument("-D", dest = "diag", default = 0, type=float, help="Screen diagonal distance")
  parser.add_argument("-W", dest = "width", default = 1, type=float, help="Width ratio")
  parser.add_argument("-H", dest = "height", default = 1, type=float, help="Height ratio")
  parser.add_argument("-vW", dest = "video_width", default = 16, type=float, help="Video width ratio")
  parser.add_argument("-vH", dest = "video_height", default = 9, type=float, help="Video height ratio")

  args = parser.parse_args()
  
  (w, h) = normalize(Fraction(args.diag), Fraction(args.width), Fraction(args.height))
  screen_a = w * h
  (video_a, video_diag) = video_dimensions(w, h, Fraction(args.video_width), Fraction(args.video_height))

  print(f"diagonal: {args.diag}")
  print(f"width: {w:.2f}")
  print(f"height: {h:.2f}")
  print(f"screen area: {screen_a:.2f}")
  print(f"video area: {video_a:.2f}")
  print(f"video diagonal: {video_diag:.2f}")
