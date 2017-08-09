import React, { Component } from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';
import {
  PanGestureHandler,
  NativeViewGestureHandler,
  State,
} from 'react-native-gesture-handler';

const USE_NATIVE_DRIVER = true;

const HEADER_HEIGHT = 50;

const SNAP_POINTS_FROM_TOP = [50, 300, 500];

export default class App extends Component {
  constructor(props) {
    super(props);

    const START = SNAP_POINTS_FROM_TOP[0];
    const END = SNAP_POINTS_FROM_TOP[SNAP_POINTS_FROM_TOP.length - 1];

    this.state = {
      lastSnap: END,
    };

    this._scrollY = new Animated.Value(0);
    this._onScroll = Animated.event(
      [{ nativeEvent: { contentOffset: { y: this._scrollY } } }],
      { useNativeDriver: USE_NATIVE_DRIVER }
    );

    this._lastScrollYValue = 0;
    this._lastScrollY = new Animated.Value(0);
    this._onRegisterLastScroll = Animated.event(
      [{ nativeEvent: { contentOffset: { y: this._lastScrollY } } }],
      { useNativeDriver: USE_NATIVE_DRIVER }
    );
    this._lastScrollY.addListener(({ value }) => {
      this._lastScrollYValue = value;
    });

    this._dragY = new Animated.Value(0);
    this._onGestureEvent = Animated.event(
      [{ nativeEvent: { translationY: this._dragY } }],
      { useNativeDriver: USE_NATIVE_DRIVER }
    );

    this._reverseLastScrollY = Animated.multiply(
      new Animated.Value(-1),
      this._lastScrollY
    );

    this._translateYOffset = new Animated.Value(END);
    this._translateY = Animated.add(
      this._translateYOffset,
      Animated.add(this._dragY, this._reverseLastScrollY)
    ).interpolate({
      inputRange: [START, END],
      outputRange: [START, END],
      extrapolate: 'clamp',
    });

    this._showScroll = this._translateY.interpolate({
      inputRange: [START, START + 1],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });
  }
  _onHandlerStateChange = ({ nativeEvent }) => {
    if (nativeEvent.oldState === State.ACTIVE) {
      let { velocityY, translationY } = nativeEvent;
      translationY -= this._lastScrollYValue;
      const dragToss = 0.05;
      const endOffsetY =
        this.state.lastSnap + translationY + dragToss * velocityY;

      let destSnapPoint = SNAP_POINTS_FROM_TOP[0];
      for (let i = 0; i < SNAP_POINTS_FROM_TOP.length; i++) {
        const snapPoint = SNAP_POINTS_FROM_TOP[i];
        const distFromSnap = Math.abs(snapPoint - endOffsetY);
        if (distFromSnap < Math.abs(destSnapPoint - endOffsetY)) {
          destSnapPoint = snapPoint;
        }
      }
      this.setState({ lastSnap: destSnapPoint });
      this._translateYOffset.extractOffset();
      this._translateYOffset.setValue(translationY);
      this._translateYOffset.flattenOffset();
      this._dragY.setValue(0);
      Animated.spring(this._translateYOffset, {
        velocity: velocityY,
        tension: 68,
        friction: 12,
        toValue: destSnapPoint,
        useNativeDriver: USE_NATIVE_DRIVER,
      }).start();
    }
  };
  render() {
    return (
      <View style={styles.container}>
        <PanGestureHandler
          id="masterdrawer"
          minDeltaY={2000 /* infinitely high */}
          maxDeltaY={this.state.lastSnap - SNAP_POINTS_FROM_TOP[0]}
          simultaneousHandlers="masterdrawer">
          <View style={StyleSheet.absoluteFillObject}>
            <PanGestureHandler
              id="drawer"
              minDeltaY={0}
              simultaneousHandlers={['scroll', 'masterdrawer']}
              onGestureEvent={this._onGestureEvent}
              onHandlerStateChange={this._onHandlerStateChange}>
              <Animated.View
                style={[
                  StyleSheet.absoluteFillObject,
                  {
                    transform: [{ translateY: this._translateY }],
                  },
                ]}>
                <View style={styles.header} />
                <NativeViewGestureHandler
                  id="scroll"
                  waitFor="masterdrawer"
                  disallowInterruption={true}
                  shouldCancelWhenOutside={false}
                  simultaneousHandlers="drawer">
                  <Animated.ScrollView
                    style={styles.scrollView}
                    bounces={false}
                    onScroll={this._onScroll}
                    onScrollBeginDrag={this._onRegisterLastScroll}
                    scrollEventThrottle={1}>
                    <Text style={styles.text}>
                      {LOREM_IPSUM}
                    </Text>
                  </Animated.ScrollView>
                </NativeViewGestureHandler>
              </Animated.View>
            </PanGestureHandler>
          </View>
        </PanGestureHandler>
      </View>
    );
  }
}

function getStateNameFromEnum(s) {
  switch (s) {
    case State.UNDETERMINED:
      return 'UNDETERMINED';
    case State.BEGAN:
      return 'BEGAN';
    case State.FAILED:
      return 'FAILED';
    case State.CANCELLED:
      return 'CANCELLED';
    case State.ACTIVE:
      return 'ACTIVE';
    case State.END:
      return 'END';
    default:
      return `Invalid gesture state: ${s}`;
  }
}

const LOREM_IPSUM = `
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque ut diam ornare libero volutpat viverra et eget nibh. In pulvinar pharetra risus, eget facilisis justo varius ut. Nunc luctus ligula sem, maximus vestibulum sapien laoreet in. Fusce vel mi et nibh dignissim gravida. Suspendisse potenti. Praesent dictum suscipit ex vitae consectetur. Aliquam nec molestie erat, ac viverra ipsum. Nulla in lorem aliquet, egestas orci id, feugiat sapien. Vivamus ac ipsum justo. Pellentesque accumsan dictum leo, ac varius dui volutpat vitae. Curabitur lacinia felis non congue dapibus. Vivamus dapibus vulputate venenatis. Donec eleifend nibh ex, ut ullamcorper tortor ultricies eget. Pellentesque volutpat sit amet arcu vitae gravida. Ut efficitur ipsum ultrices, pulvinar arcu in, porta felis.

Vivamus in est et nunc sollicitudin ultrices. Orci varius natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Proin vehicula tortor eu ante scelerisque, id vulputate justo accumsan. Vestibulum ullamcorper pellentesque tincidunt. Integer semper molestie risus commodo blandit. Curabitur vitae semper purus. Orci varius natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus.

Suspendisse consectetur maximus risus, sit amet condimentum elit interdum eget. Nullam cursus congue sem, sit amet ornare nisi sollicitudin et. Nam blandit vulputate erat eget porta. Nulla eget velit id eros bibendum pretium sed et quam. Quisque ac dui eget dolor pellentesque maximus non in massa. Vestibulum vel nulla consectetur, sodales ante et, hendrerit nisl. Donec a volutpat nisi. Nulla facilisi. Etiam nec facilisis ipsum. Aliquam eu magna aliquam, dignissim lectus sit amet, consectetur felis. Nam eget velit nisi. Duis vel massa tempor, bibendum lacus laoreet, pharetra libero. Nullam quam diam, eleifend at nibh nec, porttitor pretium massa. Nam vestibulum tempus est, eget sodales nibh euismod eu. Suspendisse sagittis blandit auctor. Morbi a nulla eu lacus ullamcorper tempus.

Phasellus elementum porta odio eget sagittis. In ultricies justo sit amet nulla hendrerit mattis. Aliquam a tellus interdum, commodo est et, lobortis erat. Donec commodo placerat justo, in consequat ante viverra quis. Maecenas condimentum libero et quam fermentum, quis interdum lectus volutpat. Nulla iaculis dui sed eros auctor, non lacinia orci pharetra. Aliquam laoreet justo et leo feugiat, ac lobortis velit ullamcorper. Aenean vestibulum ullamcorper orci vel hendrerit. Nunc pellentesque ipsum at ante convallis varius. Nullam ac sapien vestibulum, laoreet enim eget, viverra justo. Cras commodo mi ut sapien luctus bibendum aliquet quis mauris. Nulla at felis egestas, molestie tellus at, pharetra mauris. Cras lacus tellus, tincidunt non suscipit et, ullamcorper a mauris.
`;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  text: {
    paddingHorizontal: 20,
    paddingVertical: 5,
  },
  header: {
    height: HEADER_HEIGHT,
    backgroundColor: 'red',
  },
});
