#!/usr/bin/env python

import cgitb
cgitb.enable()

import cgi, json, os

print "Content-Type: application/json; charset=utf-8\n"

form = cgi.FieldStorage()
values = {}
for key in form:
    val = form.getlist(key)
    values[key] = val[0] if len(val) == 1 else val

print json.dumps(values, ensure_ascii=False)