import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { StyleSheet, Text, View, Animated, Image, Easing } from 'react-native';
import { Magnetometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';

// Cardinal directions with their angles and colors
const CARDINAL_DIRECTIONS = [
  { label: 'N', min: 337.5, max: 22.5, color: '#FF5252' },
  { label: 'NE', min: 22.5, max: 67.5, color: '#FFFFFF' },
  { label: 'E', min: 67.5, max: 112.5, color: '#4CAF50' },
  { label: 'SE', min: 112.5, max: 157.5, color: '#FFFFFF' },
  { label: 'S', min: 157.5, max: 202.5, color: '#2196F3' },
  { label: 'SW', min: 202.5, max: 247.5, color: '#FFFFFF' },
  { label: 'W', min: 247.5, max: 292.5, color: '#FFC107' },
  { label: 'NW', min: 292.5, max: 337.5, color: '#FFFFFF' },
];

const PRIMARY_DIRECTIONS = ['N', 'E', 'S', 'W'];

export default function CompassApp() {
  const [angle, setAngle] = useState(0);
  const rotateAnim = useMemo(() => new Animated.Value(0), []);
  const pulseAnim = useMemo(() => new Animated.Value(1), []);

  const getCardinalDirection = useCallback((currentAngle) => {
    const normalizedAngle = (currentAngle + 360) % 360;
    const direction = CARDINAL_DIRECTIONS.find(
      dir => (dir.min > dir.max) 
        ? normalizedAngle >= dir.min || normalizedAngle < dir.max
        : normalizedAngle >= dir.min && normalizedAngle < dir.max
    );
    return direction ? direction.label : '';
  }, []);

  const getDirectionColor = useCallback((direction) => {
    const dir = CARDINAL_DIRECTIONS.find(d => d.label === direction);
    return dir ? dir.color : '#FFFFFF';
  }, []);

  useEffect(() => {
    let lastDirection = getCardinalDirection(angle);
    
    const subscription = Magnetometer.addListener(({ x, y }) => {
      let heading = Math.atan2(y, x) * (180 / Math.PI);
      heading = heading >= 0 ? heading : 360 + heading;

      // Smooth rotation
      const currentValue = angle;
      let delta = heading - currentValue;
      
      // Handle 360-0 transition smoothly
      if (Math.abs(delta) > 180) {
        delta = delta > 0 ? delta - 360 : delta + 360;
      }
      
      const newAngle = (currentValue + delta * 0.3) % 360; // Add some damping
      setAngle(newAngle);

      Animated.spring(rotateAnim, {
        toValue: newAngle,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }).start();

      // Haptic feedback for primary directions
      const newDirection = getCardinalDirection(newAngle);
      if (PRIMARY_DIRECTIONS.includes(newDirection)) {
        if (newDirection !== lastDirection) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          lastDirection = newDirection;
        }
      }
    });

    // Pulse animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    Magnetometer.setUpdateInterval(100);

    return () => {
      subscription.remove();
      pulseAnimation.stop();
    };
  }, [angle, rotateAnim, pulseAnim, getCardinalDirection]);

  const rotation = useMemo(() => 
    rotateAnim.interpolate({
      inputRange: [0, 360],
      outputRange: ['0deg', '360deg'],
    }), 
    [rotateAnim]
  );

  const pulseStyle = useMemo(() => ({
    transform: [{ scale: pulseAnim }],
  }), [pulseAnim]);

  const currentDirection = useMemo(() => getCardinalDirection(angle), [angle, getCardinalDirection]);
  const directionColor = useMemo(() => getDirectionColor(currentDirection), [currentDirection, getDirectionColor]);
  const roundedAngle = useMemo(() => Math.round((angle + 360) % 360), [angle]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Compass</Text>
      
      <View style={styles.compassOuterRing}>
        <Animated.View style={[styles.compassContainer, pulseStyle]}>
          <Animated.Image
            source={require('./assets/compass-rose.png')}
            style={[styles.compassImage, { transform: [{ rotate: rotation }] }]}
            resizeMode="contain"
          />
          
          <View style={styles.cardinalContainer}>
            {PRIMARY_DIRECTIONS.map((dir) => (
              <Text 
                key={dir}
                style={[
                  styles.cardinalPoint, 
                  styles[dir.toLowerCase()],
                  { 
                    color: getDirectionColor(dir),
                    opacity: currentDirection === dir ? 1 : 0.7,
                    fontSize: currentDirection === dir ? 28 : 24,
                  }
                ]}
              >
                {dir}
              </Text>
            ))}
          </View>
          
          <View style={styles.centerDot} />
        </Animated.View>
      </View>
      
      <View style={styles.infoContainer}>
        <Text style={styles.angleText}>{roundedAngle}°</Text>
        <Text style={[styles.directionText, { color: directionColor }]}>
          {currentDirection}
        </Text>
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>Point your device north</Text>
      </View>
    </View>
  );
}

// Use React.memo for static components if needed
const CompassOuterRing = React.memo(({ children }) => (
  <View style={styles.compassOuterRing}>{children}</View>
));

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 40,
  },
  title: {
    fontSize: 32,
    color: '#FFFFFF',
    marginTop: 20,
    fontWeight: '300',
    letterSpacing: 4,
    textShadowColor: 'rgba(255,255,255,0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  compassOuterRing: {
    width: 320,
    height: 320,
    borderRadius: 160,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  compassContainer: {
    width: 280,
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compassImage: {
    width: '100%',
    height: '100%',
    tintColor: '#FFFFFF',
  },
  cardinalContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardinalPoint: {
    position: 'absolute',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  n: {
    top: 10,
  },
  e: {
    right: 10,
  },
  s: {
    bottom: 10,
  },
  w: {
    left: 10,
  },
  centerDot: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF5252',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  infoContainer: {
    alignItems: 'center',
  },
  angleText: {
    fontSize: 48,
    color: '#FFFFFF',
    fontWeight: '200',
    letterSpacing: 1,
  },
  directionText: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 5,
    letterSpacing: 3,
  },
  footer: {
    padding: 20,
  },
  footerText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    letterSpacing: 1,
  },
});