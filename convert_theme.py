import os
import re

directory = "src"

replacements = {
    # Backgrounds
    "bg-[#030712]": "bg-slate-50 dark:bg-[#030712]",
    "bg-[#1a2b4b]": "bg-white dark:bg-[#1a2b4b]",
    "bg-[#1a2b4b]/80": "bg-white/80 dark:bg-[#1a2b4b]/80",
    "bg-[#1a2b4b]/60": "bg-white/60 dark:bg-[#1a2b4b]/60",
    "bg-[#1a2b4b]/98": "bg-white/98 dark:bg-[#1a2b4b]/98",
    "bg-slate-900/40": "bg-slate-100 dark:bg-slate-900/40",
    "bg-black/20": "bg-slate-100 dark:bg-black/20",
    "bg-black/40": "bg-slate-200 dark:bg-black/40",
    "bg-white/5": "bg-slate-900/5 dark:bg-white/5",
    "bg-white/10": "bg-slate-900/10 dark:bg-white/10",
    
    # Text colors
    "text-white": "text-slate-900 dark:text-white",
    "text-slate-100": "text-slate-800 dark:text-slate-100",
    "text-slate-300": "text-slate-600 dark:text-slate-300",
    "text-slate-400": "text-slate-500 dark:text-slate-400",
    "text-slate-500": "text-slate-400 dark:text-slate-500",
    
    # Borders
    "border-white/5": "border-slate-900/10 dark:border-white/5",
    "border-white/10": "border-slate-900/15 dark:border-white/10",
}

for root, dirs, files in os.walk(directory):
    for file in files:
        if file.endswith(".tsx"):
            path = os.path.join(root, file)
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            
            new_content = content
            for old, new in replacements.items():
                # Only replace if not already replaced
                if old in new_content and new not in new_content:
                    # Basic word boundary handling for tailwind classes to avoid replacing inside existing strings
                    new_content = new_content.replace('"' + old + '"', '"' + new + '"')
                    new_content = new_content.replace('"' + old + ' ', '"' + new + ' ')
                    new_content = new_content.replace(' ' + old + '"', ' ' + new + '"')
                    new_content = new_content.replace(' ' + old + ' ', ' ' + new + ' ')
            
            if new_content != content:
                with open(path, "w", encoding="utf-8") as f:
                    f.write(new_content)
                print(f"Updated {file}")
