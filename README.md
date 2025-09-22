# *Problem Statement ❓* 

Traditional online fashion platforms, while vast in catalog size, struggle to deliver personalized, interactive, and community-driven experiences that resonate with diverse customer groups. Shoppers — from Gen Z trendsetters to elderly buyers — often face friction in visualization, contextual recommendations, and inclusivity, resulting in lost opportunities for deeper engagement and loyalty.

### *Problems Identified ❗*

1. *Mix-and-Match Confusion* – Users who own a single item (like a top, bottom, or accessory) often struggle to visualize how it can be paired into a complete outfit. This creates hesitation and reduces cross-selling potential.

2. *Contextual Relevance Gap* – Fashion isn’t one-size-fits-all. Weather, location, and occasion deeply influence outfit choices, yet most platforms lack dynamic, AI-driven recommendations that adapt to real-life contexts.

3. *Visualization Barriers* – Without virtual trial rooms that simulate how outfits will look in reality, customers face uncertainty, leading to higher returns and abandoned carts.

4. *Generational Disconnect* – The elderly segment remains underserved in fashion e-commerce. Lack of representation, breathable yet stylish clothing, and relatable models (as envisioned in Senora) alienate this demographic, leaving a massive market untapped.

5. *Engagement Deficit* – The absence of social interaction and community building, central to Gen Z's online experience, weakens loyalty and engagement within traditional retail spaces.

## *Use Cases 🛠* 
- Virtual Trial Rooms 🪞 – Reduce uncertainty by showing how users will look in selected outfits.
- Personalized Styling 🌦– AI suggests matching outfits based on location ,weather, occasion and preferences .
- Sync Studio 👗: AI completes an outfit when a user uploads or selects a single clothing item.
- Inclusive Fashion 🌍 – Senora line caters to elderly shoppers with stylish, comfortable clothing.
- Engagement on Platform 🛍 – Gamified outfit challenges (Style Area Battle) increase time spent and repeat visits.
- Social Shopping 📲 – Users share looks, vote, and “Shop the Look” directly from community submissions.

# *Our Solution 💡*

*Sync Studio* helps users complete their outfits by suggesting the best matching pieces from the catalog.
A user can upload or pick a single clothing item (top, bottom, or accessory), and the AI curates the rest.
This turns confusion into confidence, boosting cross-selling and customer satisfaction.

<img width="1545" height="845" alt="image" src="https://github.com/user-attachments/assets/e1fd59cc-89d4-4026-8dda-66c4be7010ba" />


- *Upload to Start* — Upload an image and let the system detect whether it’s a top, bottom or accessory.
- *Auto Classify + Smart Suggestions* — AI (image + LLM) identifies the uploaded item and suggests matching top, bottom and accessory products from the catalog.
- *Catalog Search via Embeddings* — Search and match use vector search (FAISS + OpenAI embeddings) so recommendations return real product names from your dataset.
- *Image Hosting & Sharing* — Uploaded images are stored (ImgBB in current flow) so users can share looks or submit them to challenges.

<img width="1867" height="896" alt="image-10" src="https://github.com/user-attachments/assets/56a97b71-c5b0-4029-a080-f5326d88556e" />


*Pick By Place* is a smart outfit recommender that combines weather data, semantic embeddings, and FAISS search to suggest the most suitable looks for any event or style. Powered by FastAPI, it delivers curated recommendations instantly with AI explanations.

- *FAISS + OpenAI Embeddings* – Efficient semantic similarity search over product catalog for context-aware outfit matching.
- *FastAPI Backend* – Lightweight, high-performance API layer with structured endpoints for real-time recommendations.
- *Weather API Integration* – Dynamic personalization by aligning fashion choices with live weather conditions of user’s location.

<img width="1889" height="895" alt="image-6" src="https://github.com/user-attachments/assets/28441e6c-7be6-4554-afeb-ea346ac63b08" />

<img width="1891" height="883" alt="image-7" src="https://github.com/user-attachments/assets/079f40e8-4359-455a-8237-e1d06e386e5c" />



*Virtual Vanity* 
An AI-powered virtual trial room that lets users try on outfits digitally using their uploaded photo or body measurements. It blends computer vision and generative AI to create realistic outfit overlays.

- *Computer Vision + Pose Estimation* – Accurate body detection and alignment for natural-looking outfit fitting.
- *Generative AI (Diffusion / GANs)* – Realistic rendering of fabrics, textures, and lighting for life-like try-ons.
- *Web-based Integration* – Seamless user experience via browser or mobile, no heavy local processing required.

<img width="1873" height="728" alt="image-2" src="https://github.com/user-attachments/assets/25b80d09-a660-43ca-9444-edfc91f5b520" />

### *A brand new initiative* 
*Senora* opens a fresh market by catering to senior citizens with relatable fashion options.

<img width="1428" height="800" alt="image-1" src="https://github.com/user-attachments/assets/63308821-f423-4e57-b5d6-5eef7a15114b" />


### *Welcome to The Style Arena Battleground*
*Style Arena* Battle is a monthly challenge where users create two outfits for the same theme — one Budget Look with affordable items and one Premium Look with high-end brands, all from Myntra’s catalog. After submitting, the community votes on the most creative pair, and top entries win vouchers and get featured. This drives user engagement, encourages catalog exploration, and boosts sales across both budget and premium categories.

<img width="1522" height="853" alt="image-3" src="https://github.com/user-attachments/assets/590611a6-af0f-464b-ab82-9d22ff436fec" />

<img width="1521" height="846" alt="image-4" src="https://github.com/user-attachments/assets/6deb9c19-4fca-408a-a6d3-492a2581d09a" />

<img width="1527" height="860" alt="image-5" src="https://github.com/user-attachments/assets/329deeed-9243-45b7-8599-148245b594f5" />



## *Tech Stack* 
*High Level Overview*
<img width="1321" height="597" alt="image-9" src="https://github.com/user-attachments/assets/d76e1b1e-5e1c-4ec8-8176-5594c1d3d9b8" />


- *FastAPI Backend* → Powers the API layer for recommendations and user interactions.

- *OpenAI (Embeddings + LLM)* → Generates semantic embeddings for catalog search and explains outfit choices in natural language.

- *FAISS Vector Database* → Stores embeddings and enables fast similarity search for products.

- *OpenWeather API* → Integrates real-time weather data into styling recommendations.

- *Computer Vision (OpenCV, Mediapipe, SAM/YOLO)* → For image classification, virtual try-on, and outfit visualization.

- *Frontend* → Enables upload, sharing, and gamified fashion challenges with a clean user interface.

- *Inclusive Catalog Pages* → Dedicated collections for Gen Z, elderly users, and style-based gamified challenges.

# *Future Scope*
*Video Trials 🎥* – Let users try outfits in motion by uploading short videos or using live camera feeds. The system visualizes how clothes fit, move, and drape in real time, providing a far more immersive and realistic trial experience than static images.
future scope.

![demo](https://github.com/user-attachments/assets/41d72456-61b8-4e17-a1fc-a993ec69fd87)


*Implementation Flowchart*
<img width="1594" height="646" alt="image-8" src="https://github.com/user-attachments/assets/e8765d8f-4ab2-4ae2-b89d-31fa46cc53a3" />


# Made with ❤ by Team TriSpark 
Members : Samriddhi Tripathi,
Bhavika Vishnoi, 
Pooja Singh 

## References 
[https://johannakarras.github.io/Fashion-VDM/](https://johannakarras.github.io/Fashion-VDM/)
