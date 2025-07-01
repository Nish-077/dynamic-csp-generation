import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

# Load the performance data
data = pd.read_csv('./load_time.csv')

# Set a professional and clean style
plt.style.use('seaborn-v0_8-whitegrid')
sns.set_palette("pastel")

# Create the boxplot
plt.figure(figsize=(8, 6))
# --- FIX: Assign 'x' to 'hue' and disable legend to resolve warning ---
ax = sns.boxplot(x='CSP', y='Load-Time', data=data, hue='CSP', width=0.5, legend=False)

# Set titles and labels for clarity
plt.title('Comparison of Page Load Times', fontsize=16, pad=20, weight='bold')
ax.set_xlabel('CSP Middleware Status', fontsize=12)
ax.set_ylabel('Load Time (ms)', fontsize=12)
# --- FIX: Set explicit tick labels for better readability ---
ax.set_xticklabels(['Disabled', 'Enabled'])

# --- IMPROVEMENT: Calculate medians and place labels correctly ---
# Calculate the median for each category
medians = data.groupby(['CSP'])['Load-Time'].median()
# Sort medians to match the plot order ('With Middleware', 'Without Middleware')
medians = medians.reindex(index=['Without Middleware', 'With Middleware'])

# Place text labels just above the median line for each box
vertical_offset = data['Load-Time'].median() * 0.01  # Small offset based on data scale
for xtick, median_val in enumerate(medians):
    ax.text(xtick, median_val + vertical_offset, f'{median_val:.1f} ms', 
            horizontalalignment='center', 
            size='medium', 
            color='black', 
            weight='semibold')

# Final layout adjustments
plt.tight_layout()

# Save and show the plot
plt.savefig('./page_load_times_boxplot.png', dpi=300)
plt.show()