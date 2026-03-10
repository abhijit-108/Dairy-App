# 🥛 Dairy App (Kangsaboti Dairy Rate Checker)

A modern Progressive Web Application (PWA) designed to digitize and manage the daily operations of a milk collection center.

---

## 📖 What It Does

The Dairy App streamlines the process of collecting milk from farmers (members) by automating weight and quality calculations, storing records securely, and providing instant printed receipts. 

**The Daily Workflow:**
1. **Select a Member:** Choose the registered dairy farmer from the dropdown.
2. **Input Milk Data:** Enter the Weight (KG), FAT percentage, and SNF percentage.
3. **Auto-Calculate:** The app instantly calculates the exact rate and total price based on a dynamic predefined formula.
4. **Save & Print:** Saves the record to the cloud (Firebase) and instantly prints a receipt via a connected Bluetooth thermal printer.

---

## 🚀 Key Features

*   🧮 **Instant Rate Calculation:** Automatically computes prices using dynamic FAT and SNF multipliers fetched from a configurable file (`rate.md`).
*   ☁️ **Cloud Storage (Firebase):** Securely saves and syncs daily milk collection records in real-time.
*   🖨️ **Bluetooth Thermal Printing:** Connects seamlessly to ESC/POS thermal printers via Web Bluetooth to print receipts directly from the web app.
*   🔊 **Audio Feedback:** Plays unique sound effects for successful entries, warnings, and duplicate entries, ensuring hands-free monitoring.
*   📱 **Progressive Web App (PWA):** Fully installable on Android/iOS devices for an app-like experience (with `manifest.json` and service workers).
*   🔔 **Push Notifications:** Integrated with Firebase Cloud Messaging to send alerts to the user device.
*   🌗 **Dark Mode & Modern UI:** A responsive, mobile-first design with a built-in dark mode toggle for comfortable usage in any lighting.
*   📋 **Member Management:** Reads and loads customer names dynamically from a simple configuration file (`name.md`).
*   📊 **Bill Generation:** Dedicated pages for generating bills and viewing older records/photos.

---

## 🛠️ Tech Stack Overview

*   **Frontend:** HTML5, CSS3, Vanilla JavaScript
*   **Backend / Database:** Firebase Realtime Database
*   **Hardware Integration:** Web Bluetooth API (for Thermal Printers)
*   **Icons:** Boxicons

---
*Developed by Delsgade*