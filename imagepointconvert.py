import cv2
import numpy as np
import matplotlib.pyplot as plt

# Load the image
image_path = "giorno.jpg"  # Change this to the uploaded image path
image = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)

# Convert to binary (Thresholding)
_, binary = cv2.threshold(image, 128, 255, cv2.THRESH_BINARY_INV)  # Invert for white shape

# Find contours
contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

# Create an empty mask
mask = np.zeros_like(binary)

# Fill the contour area
cv2.drawContours(mask, contours, -1, (255), thickness=cv2.FILLED)

# Get all points inside the shape
y_coords, x_coords = np.where(mask == 255)

# Randomly select a subset of points to simulate stars
num_stars = 500  # Adjust the number of stars
indices = np.random.choice(len(x_coords), num_stars, replace=False)
star_positions = np.column_stack((x_coords[indices], y_coords[indices]))

# Plot the "stars"
plt.figure(figsize=(6,6))
plt.scatter(star_positions[:, 0], -star_positions[:, 1], s=1, color='white')  # Inverted Y-axis for proper orientation
plt.gca().set_facecolor('black')
plt.axis("off")
plt.show()
