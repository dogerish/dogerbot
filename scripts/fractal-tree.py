#! /usr/bin/python3
speedtest = False
from math import sin, cos, pi
from random import randrange
if speedtest: from time import time
import pygame, sys

if speedtest: start = time()
noneargs = (None, "", ' ', "None", "N/A", "n/a", '/', '-')

default = lambda arg, d: arg if arg not in noneargs else d
arglist = "out, color, bgcolor, angInc, lenInc, maxBranch, res, initlen"

if len(sys.argv) > 1 and sys.argv[1] == "help":
    print(arglist)
    quit()

def hexstr(string):
    if type(string) == int: return string
    if string.startswith('#'):
        return eval(f'0x{string[1:]}')
    elif string.startswith('0x'):
        return eval(f'0x{string[2:]}')
    else:
        return eval(f'0x{string}')

def getit(var, d, func=lambda x: x):
    var = default(var, d)
    if var == d: return var
    try:
        return func(var)
    except: return d

def get(out=None, color=None, bgcolor=None, angInc=None, lenInc=None, maxBranch=None, res=None, initlen=None, *catchall):
    out = getit(out, 'saved_img.png')
    color = getit(color, 0x8000FF, hexstr)
    bgcolor = getit(bgcolor, 0, hexstr)
    angInc = getit(angInc, pi/6, lambda x: float(x)*pi/180)
    lenInc = getit(lenInc, 3/4, lambda x: abs(float(x)))
    maxBranch = getit(maxBranch, 15, lambda x: min(abs(int(x)), 16))
    res = getit(res, [1000], lambda x: [min(abs(int(default(r, 0))), 2500) for r in x.split('x')])
    initlen = getit(initlen, None, float)

    return eval('(' + arglist + ')')

def trim(x, y, w, h, super_w, super_h):
    x, y = min(max(x, 0), super_w), min(max(y, 0), super_h)
    return x, y, min(w, super_w - x), min(h, super_h - y)

exec(arglist + ' = get(*sys.argv[1:])')
if speedtest:
    args_set = [time()]
    args_set.append(args_set[0] - start)
ratio = 966/746
if res[0] == 0 and res[1] == 0:
    res[0] = 1000
xv = round(res[0]/ratio)
if len(res) == 1:
    res.append(xv)
elif res[1] == 0:
    res[1] = xv
if len(res) >= 2 and res[0] == 0:
    res[0] = round(res[1]*ratio)
elif res[0] != 0 and len(res) >= 2:
    initlen = 200
if initlen == None: initlen = res[0]/4.8
# y-value of the ground
ground = res[1]
# initial branch size

# rotates the point by a radians
rotate = lambda pos, r, a: (cos(a)*r + pos[0], sin(a)*r + pos[1])
if speedtest:
    res_set = [time()]
    res_set.append(res_set[0] - args_set[0])

surface = pygame.Surface(res)
points_x = []
points_y = []
def add(point):
    points_x.append(point[0])
    points_y.append(point[1])
draw = lambda point1, point2: pygame.draw.line(surface, color, point1, point2)

if speedtest:
    surf_set = [time()]
    surf_set.append(surf_set[0] - res_set[0])

base = res[0]/2
base2 = res[0]
# draws a branch starting at (x, y), with the length l, at the angle a, with the color c
def branch(pos, l, a, branches):
    if branches == maxBranch: return add(pos)
    newPos = rotate(pos, l, a)
    draw(pos, newPos)
    draw((base2 - pos[0], pos[1]), (base2 - newPos[0], newPos[1]))
    branch(newPos, l*lenInc, a + angInc, branches + 1)
    if branches != 0: branch(newPos, l*lenInc, a - angInc, branches + 1)

if bgcolor != 0: surface.fill(bgcolor)
if speedtest:
    ready_set = [time()]
    ready_set.append(ready_set[0] - surf_set[0])
branch((base, ground), initlen, -pi/2, 0)
if speedtest:
    drawn = [time()]
    drawn.append(drawn[0] - ready_set[0])
maxi = max(points_x)
coords = [base2 - maxi, min(points_y)]
coords += [max(maxi - coords[0], 1), max(ground - coords[1], 1)]
if speedtest:
    coords_set = [time()]
    coords_set.append(coords_set[0] - drawn[0])
area = pygame.Rect(*trim(*coords, surface.get_width(), surface.get_height()))
if speedtest:
    area_set = [time()]
    area_set.append(area_set[0] - coords_set[0])

pygame.image.save(surface.subsurface(area), out)
if speedtest:
    saved = [time()]
    saved.append(saved[0] - area_set[0])
if speedtest:
    print(f"""
    ARGS:   {args_set[1]*1000}ms
    RES:    {res_set[1]*1000}ms
    SURF:   {surf_set[1]*1000}ms
    READY:  {ready_set[1]*1000}ms
    DRAWN:  {drawn[1]*1000}ms
    COORDS: {coords_set[1]*1000}ms
    AREA:   {area_set[1]*1000}ms
    SAVED:  {saved[1]*1000}ms
    """)
print(out)
