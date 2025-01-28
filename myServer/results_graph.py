import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import json
import matplotlib.cm as cm
import mplcursors

directives = {}

with open('./csp-violation.log', 'r') as file:
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

colors = cm.get_cmap('tab20', len(directive))(range(len(directive)))

plt.figure(figsize=(10, 6))
bars = plt.bar(directive, counts, color=colors)
plt.xlabel('Violated Directives')
plt.ylabel('Count of Violations')
plt.title('Count of CSP Violations by Directive')
plt.xticks(rotation=45, ha='right')
plt.grid(axis='y', linestyle='--', alpha=0.7)

for i, count in enumerate(counts):
    plt.text(i, count + 0.1, str(count), ha='center', va='bottom')

plt.tight_layout()

mplcursors.cursor(bars)

plt.savefig('./csp_violations_by_directive.png')
plt.show()


data = pd.read_csv('./load_time.csv')

plt.figure(figsize=(10, 6))
ax = data.boxplot(by="CSP", column=['Load-Time'], grid=False, patch_artist=True)
plt.suptitle('')
plt.xlabel('CSP')
plt.ylabel('Load Time (ms)')

colors = ['#FF9999', '#66B2FF', '#99FF99', '#FFCC99', '#FFD700', '#FF6347', '#8A2BE2', '#00CED1']

for patch, color in zip(ax.artists, colors):
    patch.set_facecolor(color)

for whisker in ax.lines[::2]:
    whisker.set(color='#8B008B', linewidth=1.5)
for cap in ax.lines[1::2]:
    cap.set(color='#8B008B', linewidth=1.5)
for median in ax.lines[4::6]:
    median.set(color='#FF4500', linewidth=2)

medians = data.groupby(['CSP'])['Load-Time'].median().values
median_labels = [str(np.round(s, 2)) for s in medians]

pos = range(len(medians))
for tick, label in zip(pos, ax.get_xticklabels()):
    plt.text(pos[tick] + 1, medians[tick] + 15, median_labels[tick], horizontalalignment='center', color='black', weight='semibold')

plt.tight_layout()
plt.savefig('./page_load_times_boxplot.png')
plt.show()