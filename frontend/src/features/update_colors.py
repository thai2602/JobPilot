import re
import os

files_to_update = [
    'home/HomePage.tsx',
    'jobs/JobsPage.tsx',
    'companies/CompaniesPage.tsx',
]

replacements = [
    (r'text-slate-(\d+)', r'text-gray-\1'),
    (r'bg-slate-(\d+)', r'bg-gray-\1'),
    (r'border-slate-(\d+)', r'border-gray-\1'),
    (r'text-emerald-(\d+)', r'text-[#20c997]'),
    (r'bg-emerald-(\d+)', r'bg-[#20c997]'),
    (r'border-emerald-(\d+)', r'border-[#20c997]'),
    (r'text-blue-700', r'text-[#20c997]'),
    (r'text-blue-600', r'text-[#0f4c51]'),
    (r'bg-blue-600', r'bg-[#0f4c51]'),
    (r'hover:bg-blue-700', r'hover:bg-[#1b7377]'),
    (r'hover:bg-blue-600', r'hover:bg-[#1b7377]'),
    (r'bg-blue-50', r'bg-[#20c997]/10'),
    (r'border-blue-200', r'border-[#20c997]/20'),
    (r'bg-blue-100', r'bg-[#20c997]/10'),
    (r'text-blue-600', r'text-[#0f4c51]'),
]

for file_path in files_to_update:
    full_path = os.path.join(os.path.dirname(__file__), file_path)
    if os.path.exists(full_path):
        with open(full_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        for pattern, replacement in replacements:
            content = re.sub(pattern, replacement, content)
        
        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"Updated {file_path}")
    else:
        print(f"File not found: {file_path}")

print("Color replacement complete!")
