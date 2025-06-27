import matplotlib.pyplot as plt
import json
import os

def get_url_statistics():
    try:
        with open('urls.json', 'r') as file:
            url_data = json.load(file)
            
            # Initialize counters - removed 'unknown' category
            stats = {
                'safe': 0,
                'malicious': 0,
                'jsonp_vulnerable': 0
            }
            
            # Only count URLs with definitive status (not unknown)
            for url_info in url_data.values():
                if url_info.get('safe') is True:
                    stats['safe'] += 1
                elif url_info.get('safe') is False:
                    if url_info.get('status') == 'jsonp_vulnerable':
                        stats['jsonp_vulnerable'] += 1
                    else:
                        stats['malicious'] += 1
                    
            return stats
    except FileNotFoundError:
        return {'safe': 0, 'malicious': 0, 'jsonp_vulnerable': 0}
    except json.JSONDecodeError:
        print("Error: urls.json is empty or malformed")
        return {'safe': 0, 'malicious': 0, 'jsonp_vulnerable': 0}

def create_url_distribution_chart():
    stats = get_url_statistics()
    
    # Remove categories with zero count
    stats = {k: v for k, v in stats.items() if v > 0}
    
    if not stats:
        print("No URLs with definitive status found. Please ensure the system has processed some URLs first.")
        return
        
    # Data for pie chart
    labels = list(stats.keys())
    sizes = list(stats.values())
    colors = {
        'safe': '#2ecc71',         # Green
        'malicious': '#e74c3c',    # Red
        'jsonp_vulnerable': '#f39c12'  # Orange
    }
    
    # Create pie chart
    plt.figure(figsize=(10, 8))
    plt.pie([stats[key] for key in labels], 
            labels=[key.replace('_', ' ').title() for key in labels],
            colors=[colors[key] for key in labels],
            autopct='%1.1f%%', 
            startangle=90)
    plt.axis('equal')
    plt.title('Distribution of Analyzed URLs')
    
    # Save the chart
    plt.savefig('url_distribution_chart.png')
    
    # Print statistics for analyzed URLs only
    total = sum(stats.values())
    if total > 0:
        print(f"\nURL Analysis Statistics (Excluding Unknown/Unscanned URLs):")
        print(f"Total URLs analyzed: {total}")
        for category, count in stats.items():
            print(f"{category.replace('_', ' ').title()}: {count} ({(count/total)*100:.1f}%)")
    else:
        print("No URLs have been fully analyzed yet.")

if __name__ == "__main__":
    create_url_distribution_chart()