# 🏘️ Routes by Towns - Búsqueda de Rutas por Pueblos

## Overview / Descripción

This feature allows cyclists to discover and organize their activities by the towns/cities they pass through. Extract towns from your activity track data and search for all rides that went through a specific place.

Esta función permite a los ciclistas descubrir y organizar sus actividades según los pueblos por los que pasan. Extrae pueblos de los datos del track de la actividad y busca todas las rutas que pasaron por un lugar específico.

## Features / Características

✅ **Town Extraction** - Automatically extract towns from activity GPS tracks using reverse geocoding
✅ **Database Storage** - Store extracted towns to avoid re-processing
✅ **Search by Town** - Find all activities that pass through a specific town
✅ **Town List** - View all towns you've ridden through with activity counts
✅ **Batch Processing** - Process multiple activities at once to extract towns

## How It Works / Cómo Funciona

### 1. **Configuration**

**Google Maps API Setup** (Recommended for accuracy):

```bash
# Add to your .env file:
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

**Get your API Key:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable the "Geocoding API"
4. Create an API Key (Restricted to Geocoding API)
5. Add the key to your `.env` file

**Fallback** (No API Key):
If you don't configure Google Maps API, the system will use a simple fallback that extracts basic location info from coordinate bounds.

### 2. **Database Tables**

Three new tables are created automatically:

```sql
-- Towns discovered in activities
CREATE TABLE towns (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) UNIQUE,
  lat DECIMAL(10,8),
  lng DECIMAL(11,8),
  province VARCHAR(100),
  country VARCHAR(100)
);

-- Link activities to towns
CREATE TABLE activity_towns (
  id INT PRIMARY KEY AUTO_INCREMENT,
  athlete_id BIGINT,
  activity_id BIGINT,
  town_id INT,
  UNIQUE KEY (activity_id, town_id)
);
```

### 3. **Batch Processing**

Process all your activities to extract towns:

```bash
POST /towns/batch-process
Body: { athlete_id: 117638 }
```

This will:
1. Fetch all activities for the athlete
2. Decode their GPS tracks (polylines)
3. Sample coordinates (~20 points per activity)
4. Reverse geocode coordinates to towns
5. Store town associations in the database

⏱️ **Processing Time**: ~2-3 minutes for 100+ activities

### 4. **Frontend Usage**

Navigate to **"Búsqueda por Pueblos"** (🏘️) in the hamburger menu:

- **View All Towns** - See all towns you've ridden through, sorted by activity count
- **Search** - Find specific towns you've visited
- **View Activities** - Click a town to see all activities that pass through it
- **Activity Details** - See distance, time, type for each ride through that town

## Backend API Endpoints

### GET /towns/athlete
Get all towns with activity counts for an athlete.

```bash
GET http://localhost:3001/towns/athlete?athlete_id=117638

Response:
{
  "athlete_id": 117638,
  "totalTowns": 24,
  "towns": [
    {
      "id": 1,
      "name": "Barcelona",
      "province": "Barcelona",
      "country": "España",
      "activityCount": 15,
      "lat": 41.3851,
      "lng": 2.1734
    },
    ...
  ]
}
```

### GET /towns/search
Search towns by name.

```bash
GET http://localhost:3001/towns/search?athlete_id=117638&q=Barcelona

Response:
{
  "query": "Barcelona",
  "results": [
    {
      "id": 1,
      "name": "Barcelona",
      "province": "Barcelona",
      "activityCount": 15,
      "lat": 41.3851,
      "lng": 2.1734
    }
  ]
}
```

### GET /towns/:townId/activities
Get all activities that pass through a town.

```bash
GET http://localhost:3001/towns/1/activities?athlete_id=117638

Response:
{
  "townId": 1,
  "activityCount": 15,
  "activities": [
    {
      "id": 12345,
      "name": "Morning ride through Barcelona",
      "date": "2024-01-15T08:30:00Z",
      "distance": 45000,
      "movingTime": 7200,
      "type": "Ride"
    },
    ...
  ]
}
```

### GET /towns/activity/:activityId
Get all towns for a specific activity.

```bash
GET http://localhost:3001/towns/activity/12345

Response:
{
  "activityId": 12345,
  "townCount": 8,
  "towns": [
    {
      "id": 1,
      "name": "Barcelona",
      "province": "Barcelona",
      "country": "España",
      "lat": 41.3851,
      "lng": 2.1734
    },
    ...
  ]
}
```

### POST /towns/activity/:activityId/extract
Process a single activity and extract towns.

```bash
POST http://localhost:3001/towns/activity/12345?athlete_id=117638

Response:
{
  "activityId": 12345,
  "townCount": 8,
  "towns": [
    {
      "name": "Barcelona",
      "province": "Barcelona",
      "country": "España",
      "lat": 41.3851,
      "lng": 2.1734
    },
    ...
  ]
}
```

### POST /towns/batch-process
Process all activities for an athlete.

```bash
POST http://localhost:3001/towns/batch-process
Body: { athlete_id: 117638 }

Response:
{
  "message": "Batch processing complete",
  "processed": 45,
  "skipped": 5,
  "total": 50,
  "errors": [
    {
      "activityId": 12345,
      "error": "No track data"
    }
  ]
}
```

## Architecture / Arquitectura

### File Structure

```
backend/
├── src/
│   ├── routes/
│   │   └── towns.js          # All town-related endpoints
│   ├── services/
│   │   └── towns.js          # Reverse geocoding & track processing
│   └── models/
│       └── towns.js          # Database operations
│
frontend/
└── components/
    └── RoutesSearchScreen.tsx # UI for town searching
```

### Services

**towns.js** (services):
- `extractTownsFromTrack(coordinates)` - Extract towns from GPS coordinates
- `reverseGeocode(lat, lng)` - Convert coordinates to town names
- `decodePolyline(encoded)` - Decode Google polyline format

**towns.js** (models):
- `findOrCreateTown(townData)` - Get or create town in DB
- `linkActivityToTowns(athlete_id, activity_id, towns)` - Associate activity with towns
- `getTownsForActivity(activity_id)` - Get towns for an activity
- `getActivitiesInTown(athlete_id, town_id)` - Get activities in a town
- `getTownsForAthlete(athlete_id)` - Get all athlete's towns
- `searchTownsByName(athlete_id, searchTerm)` - Search for towns

## Performance Considerations

- **Reverse Geocoding Rate Limits**: Google Maps allows ~600 requests/min with proper API key
- **Caching**: Towns are cached in memory to avoid re-geocoding
- **Sampling**: Track data is sampled (~20 points) to reduce API calls
- **DB Indexes**: activity_towns table has indexes on athlete_id and town_id for fast queries

## Future Enhancements

🔮 **Planned Features**:
- Map visualization of town network
- Route statistics by town (avg duration, elevation, etc.)
- Export town visit history
- Social features: Compare town explorations with other cyclists
- Town-based challenges and achievements
- Weather analysis for town visits

## Troubleshooting

**Issue**: "No pueblos registrados" - No towns appearing
- **Solution**: Click the ⚙️ button or go to "Procesar Actividades" to batch process activities

**Issue**: Empty search results
- **Solution**: Make sure you've processed activities first with batch processing

**Issue**: Slow reverse geocoding
- **Solution**: Verify Google Maps API key is configured and has sufficient quota

**Issue**: "Error loading towns"
- **Solution**: Check backend is running and database schema is initialized

## Technical Notes

- **Polyline Encoding**: Activity tracks from Strava come as encoded polylines (Google's format)
- **Reverse Geocoding**: Uses Google Maps Geocoding API (requires API key for best results)
- **Coordinate Sampling**: To optimize API calls, we sample ~20 points from each activity track
- **Spanish Language**: Results are requested in Spanish (es) from Google Maps API
