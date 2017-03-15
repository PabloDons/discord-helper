#!/usr/bin/env python
# -*- coding: utf-8 -*-
#
# web-boardimage is an HTTP service that renders chess board images.
# Copyright (C) 2016 Niklas Fiekas <niklas.fiekas@backscattering.de>
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as
# published by the Free Software Foundation, either version 3 of the
# License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.

"""An HTTP service that renders chess board images"""

import argparse
# import asyncio
import chess
import chess.svg
import cairosvg
# import re
import json
import sys

class Service:
    def __init__(self, css=None):
        self.css = css or chess.svg.DEFAULT_STYLE

    def make_svg(self, request):
        parts = request["fen"].replace("_", " ").split(" ", 1)
        board = chess.BaseBoard("/".join(parts[0].split("/")[0:8]))
        size = min(max(int(request.get("size", 360)), 16), 1024)

        try:
            uci = request.get("lastMove") or request["lastmove"]
            lastmove = chess.Move.from_uci(uci)
        except KeyError:
            lastmove = None

        try:
            check = chess.SQUARE_NAMES.index(request["check"])
        except KeyError:
            check = None

        flipped = request.get("orientation", "white") == "black"

        return chess.svg.board(board, coordinates=True, flipped=flipped, lastmove=lastmove, check=check, size=size, style=self.css)

    def render_svg(self, request):
        return self.make_svg(request)

    def render_png(self, request):
        svg_data = self.make_svg(request)
        return cairosvg.svg2png(bytestring=svg_data)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    #parser.add_argument("--port", "-p", type=int, default=8080, help="web server port")
    #parser.add_argument("--bind", default="127.0.0.1", help="bind address (default: 127.0.0.1)")
    parser.add_argument("--css", type=argparse.FileType("r"))
    args = parser.parse_args()

    #app = aiohttp.web.Application()
    service = Service(args.css.read() if args.css else None)

    while 1:
        line = json.loads(sys.stdin.readline())
        if line["type"] == "png":
            sys.stdout.buffer.write(service.render_png(line["render"]))
        elif line["type"] == "svg":
            sys.stdout.buffer.write(service.render_svg(line["render"]))
