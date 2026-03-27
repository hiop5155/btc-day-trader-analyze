#!/usr/bin/env python3
"""
show_trades.py — Parse trade YAML files and display a summary table.
Usage: python3 show_trades.py [--open] [--closed] [--detail <id>]
"""

import os
import sys
import glob
import argparse
from pathlib import Path

try:
    import yaml
except ImportError:
    print("PyYAML not installed. Run: pip install pyyaml")
    sys.exit(1)

TRADES_DIR = Path(__file__).parent / "trades"
GREEN = "\033[92m"
RED   = "\033[91m"
CYAN  = "\033[96m"
BOLD  = "\033[1m"
DIM   = "\033[2m"
RESET = "\033[0m"


def load_trades(filter_status=None):
    trades = []
    for path in sorted(glob.glob(str(TRADES_DIR / "*.yaml"))):
        with open(path) as f:
            data = yaml.safe_load(f)
        if filter_status and data["close"]["status"] != filter_status:
            continue
        data["_file"] = os.path.basename(path)
        trades.append(data)
    return trades


def color_pnl(val):
    if val is None:
        return f"{DIM}—{RESET}"
    c = GREEN if val >= 0 else RED
    sign = "+" if val >= 0 else ""
    return f"{c}{sign}{val:.2f}{RESET}"


def color_status(status):
    if status == "OPEN":
        return f"{CYAN}{status}{RESET}"
    if status == "CLOSED":
        return f"{GREEN}{status}{RESET}"
    return f"{DIM}{status}{RESET}"


def print_table(trades):
    if not trades:
        print("No trades found.")
        return

    # Header
    print(f"\n{BOLD}{'#':<4} {'Date':<14} {'Dir':<6} {'Grd':<4} {'Entry':>7} {'SL':>7} {'TP1':>7} {'Cls':>7} {'PnL':>8}  Status{RESET}")
    print("─" * 72)

    total_pnl = 0.0
    wins = losses = open_count = 0

    for t in trades:
        tid      = t.get("id", "?")
        dt       = str(t.get("datetime_utc8", ""))[:12]
        dirn     = t.get("direction", "?")
        grade    = t.get("grade", "?")
        o        = t.get("open", {})
        c        = t.get("close", {})
        entry    = o.get("entry", "—")
        sl       = o.get("sl", "—")
        tp1      = o.get("tp1", "—")
        cls_px   = c.get("close_price") or "—"
        pnl      = c.get("pnl_usd")
        status   = c.get("status", "?")

        dir_color = GREEN if dirn == "LONG" else RED
        pnl_str   = color_pnl(pnl)
        sts_str   = color_status(status)

        print(f"{tid:<4} {dt:<14} {dir_color}{dirn:<6}{RESET} {grade:<4} "
              f"{entry:>7} {sl:>7} {tp1:>7} {str(cls_px):>7} {pnl_str:>8}  {sts_str}")

        if status == "CLOSED" and pnl is not None:
            total_pnl += pnl
            if pnl >= 0:
                wins += 1
            else:
                losses += 1
        elif status == "OPEN":
            open_count += 1

    # Summary
    closed = wins + losses
    win_rate = (wins / closed * 100) if closed else 0
    print("─" * 72)
    print(f"  Closed: {closed}  |  W:{wins} L:{losses}  |  Win rate: {win_rate:.0f}%  |  "
          f"Total PnL: {color_pnl(total_pnl)}  |  Open: {open_count}")
    print()


def print_detail(trades, trade_id):
    match = [t for t in trades if t.get("id") == trade_id]
    if not match:
        print(f"Trade #{trade_id} not found.")
        return
    t = match[0]
    print(f"\n{BOLD}Trade #{t['id']} — {t['direction']} {t['datetime_utc8']}{RESET}")
    print(f"  File   : {t['_file']}")
    print(f"  Grade  : {t.get('grade', '?')}")
    o = t.get("open", {})
    print(f"\n  {BOLD}Open{RESET}")
    print(f"    Entry      : {o.get('entry')}")
    print(f"    SL / TP1 / TP2 : {o.get('sl')} / {o.get('tp1')} / {o.get('tp2')}")
    print(f"    Contracts  : {o.get('contracts')}")
    print(f"    Risk       : ${o.get('risk_usd')} ({o.get('risk_pct')}%)")
    print(f"    Order ID   : {o.get('order_id')}")
    c = t.get("close", {})
    print(f"\n  {BOLD}Close{RESET}")
    print(f"    Status     : {color_status(c.get('status'))}")
    print(f"    Close px   : {c.get('close_price') or '—'}")
    print(f"    PnL        : {color_pnl(c.get('pnl_usd'))}")
    if c.get("funding_fee") is not None:
        print(f"    Funding fee: {c.get('funding_fee')}")
    print(f"    Exit reason: {c.get('exit_reason') or '—'}")
    if t.get("thesis"):
        print(f"\n  {BOLD}Thesis{RESET}")
        for line in t["thesis"].strip().splitlines():
            print(f"    {line}")
    adjs = t.get("adjustments") or []
    if adjs:
        print(f"\n  {BOLD}Adjustments{RESET}")
        for a in adjs:
            print(f"    [{a.get('datetime_utc8')}] {a.get('type')}: {a.get('from')} → {a.get('to')}  ({a.get('note','')})")
    print()


def main():
    parser = argparse.ArgumentParser(description="Show trade records")
    parser.add_argument("--open",   action="store_true", help="Only open trades")
    parser.add_argument("--closed", action="store_true", help="Only closed trades")
    parser.add_argument("--detail", type=int, metavar="ID", help="Full detail for trade ID")
    args = parser.parse_args()

    filter_status = None
    if args.open:
        filter_status = "OPEN"
    elif args.closed:
        filter_status = "CLOSED"

    trades = load_trades()

    if args.detail:
        print_detail(trades, args.detail)
    else:
        filtered = [t for t in trades if filter_status is None or t["close"]["status"] == filter_status]
        print_table(filtered)


if __name__ == "__main__":
    main()
