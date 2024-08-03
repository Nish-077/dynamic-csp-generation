import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import json

directives = {}

with open('./csp-violation.log','r') as file:
    for line in file:
        line = line.strip()
        if line:
            data = json.loads(line)
            directive = ''
            if data['csp-report']['violated-directive'] == 'script-src-ele':
                directive = 'script-src'
            elif data['csp-report']['violated-directive'] == 'style-src-elem':
                directive = 'style-src'
            else: 
                directive = data['csp-report']['violated-directive']
            
            if directive in directives:
                directives[directive] += 1
            else:
                directives[directive] = 1
                
directive = list(directives.keys())
counts = list(directives.values())

plt.figure(figsize=(10,6))
plt.bar(directive,counts, color='skyblue')
plt.xlabel('Violated Directives')
plt.ylabel('Count of Violations')
plt.title('Count of CSP Violations by Directive')
plt.xticks(rotation=45, ha='right')
plt.grid(axis='y', linestyle='--', alpha=0.7)

for i, count in enumerate(counts):
    plt.text(i, count + 0.1, str(count), ha='center', va='bottom')
    
plt.tight_layout()

plt.savefig('./csp_violations_by_directive.png')
plt.show()




data = pd.read_csv('./load_time.csv')

plt.figure(figsize=(10,6))
boxplot = data.boxplot(by="CSP", column=['Load-Time'], grid=False)
plt.suptitle('')
plt.xlabel('CSP')
plt.ylabel('Load Time (ms)')

medians = data.groupby(['CSP'])['Load-Time'].median().values
median_labels = [str(np.round(s, 2)) for s in medians]

pos = range(len(medians))
for tick, label in zip(pos, boxplot.get_xticklabels()):
    plt.text(pos[tick]+1, medians[tick] + 15, median_labels[tick], horizontalalignment='center', color='black', weight='semibold')
plt.savefig('./page_load_times_boxplot.png')
plt.show()

