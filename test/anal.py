from PIL import Image
from sklearn.cluster import KMeans
import numpy as np
import cv2

def get_dominant_colors(image_path, num_clusters=5, resize_factor=0.2):
    # Load the image
    image = Image.open(image_path)
    
    # Resize the image to speed up the process
    image = image.resize((int(image.width * resize_factor), int(image.height * resize_factor)))
    
    # Convert the image to RGB and then to numpy array
    image = np.array(image.convert('RGB'))
    
    # Reshape the image to be a list of pixels
    pixels = image.reshape((-1, 3))
    
    # Convert the pixels to float type
    pixels = np.float32(pixels)
    
    # Use KMeans to find the dominant colors
    kmeans = KMeans(n_clusters=num_clusters)
    kmeans.fit(pixels)
    
    # Get the cluster centers (dominant colors)
    dominant_colors = kmeans.cluster_centers_
    
    # Convert to integer and then to hexadecimal format
    hex_colors = ['#{:02x}{:02x}{:02x}'.format(int(c[0]), int(c[1]), int(c[2])) for c in dominant_colors]
    
    return hex_colors

def merge_similar_colors(hex_colors, threshold=30):
    # Convert hex colors to RGB
    rgb_colors = [tuple(int(h[i:i+2], 16) for i in (1, 3, 5)) for h in hex_colors]
    
    # Create a list to store merged colors
    merged_colors = []
    
    for color in rgb_colors:
        found = False
        for i, avg_color in enumerate(merged_colors):
            # Calculate the Euclidean distance between colors
            if np.linalg.norm(np.array(color) - np.array(avg_color)) < threshold:
                # Average the similar colors
                merged_colors[i] = tuple((np.array(avg_color) + np.array(color)) // 2)
                found = True
                break
        if not found:
            merged_colors.append(color)
    
    # Convert merged RGB colors back to hex
    merged_hex_colors = ['#{:02x}{:02x}{:02x}'.format(c[0], c[1], c[2]) for c in merged_colors]
    
    return merged_hex_colors

if __name__ == "__main__":
    # Path to your image
    image_path = "input.png"
    
    # Step 1: Get the dominant colors
    dominant_colors = get_dominant_colors(image_path, num_clusters=8)
    print("Dominant Colors:", dominant_colors)
    
    # Step 2: Merge similar colors
    final_colors = merge_similar_colors(dominant_colors, threshold=30)
    print("Merged Colors:", final_colors)
