import json
import os
import matplotlib.pyplot as plt
import numpy as np

def generate_visuals():
    """
    Reads the evaluation-stats.json file and generates a bar chart
    of CSP violations by directive.
    """
    # Construct the path to the JSON file, which is in the parent directory
    stats_file_path = os.path.join(os.path.dirname(__file__), '..', 'evaluation-stats.json')
    output_chart_path = os.path.join(os.path.dirname(__file__), 'csp_violations_chart2.png')

    # --- 1. Read the JSON data ---
    try:
        with open(stats_file_path, 'r') as f:
            stats_data = json.load(f)
        print(f"Successfully loaded data from {stats_file_path}")
    except FileNotFoundError:
        print(f"Error: The file {stats_file_path} was not found.")
        print("Please run the server and trigger some CSP violations first.")
        return
    except json.JSONDecodeError:
        print(f"Error: Could not decode JSON from {stats_file_path}. The file might be empty or corrupt.")
        return

    if not stats_data:
        print("The stats file is empty. No chart will be generated.")
        return

    # --- 2. Prepare data for plotting ---
    directives = list(stats_data.keys())
    violation_counts = [stats_data[d]['violationCount'] for d in directives]

    # --- 3. Create and style the bar chart ---
    plt.style.use('seaborn-v0_8-whitegrid')
    # FIX: Increase figure size for a "zoomed out" look
    fig, ax = plt.subplots(figsize=(10, 6))

    # FIX: Define a color palette for the bars
    colors = plt.cm.viridis(np.linspace(0.2, 0.8, len(directives)))

    # FIX: Use the new colors and adjust bar width
    bars = ax.bar(directives, violation_counts, color=colors, width=0.3)

    # FIX: Remove vertical grid lines
    ax.xaxis.grid(False)

    # Add titles and labels
    ax.set_title('CSP Violations by Directive on Second Page Load After Dynamic Adjustment', fontsize=16, fontweight='bold', pad=20)
    ax.set_ylabel('Number of Violations', fontsize=12)
    ax.set_xlabel('CSP Directive', fontsize=12)

    # Rotate x-axis labels for better readability
    plt.xticks(rotation=45, ha='right')

    # FIX: Adjust y-axis to give more space at the top
    ax.set_ylim(0, max(violation_counts) * 1.15)

    # Add the count number on top of each bar
    for bar in bars:
        yval = bar.get_height()
        # Adjust text position slightly for the new y-axis limit
        ax.text(bar.get_x() + bar.get_width()/2.0, yval + 0.05, int(yval), va='bottom', ha='center')

    # Ensure the layout is tight and save the figure
    fig.tight_layout()
    
    try:
        plt.savefig(output_chart_path, dpi=300)
        print(f"Chart successfully saved to {output_chart_path}")
    except Exception as e:
        print(f"Error saving chart: {e}")


if __name__ == "__main__":
    generate_visuals()