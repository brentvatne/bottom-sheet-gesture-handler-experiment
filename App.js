import React, { Component } from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';
import {
  PanGestureHandler,
  NativeViewGestureHandler,
  State,
} from 'react-native-gesture-handler';

const USE_NATIVE_DRIVER = true;
const HEADER_HEIGHT = 50;
const HEIGHT = Dimensions.get('window').height - HEADER_HEIGHT * 4;
const INITIAL_TRANSLATE_Y_OFFSET = HEIGHT;

export default class App extends Component {
  constructor(props) {
    super(props);

    // Value fed in directly from Animated.ScrollView onScroll event
    this._scrollY = new Animated.Value(0);
    this._onScroll = Animated.event(
      [{ nativeEvent: { contentOffset: { y: this._scrollY } } }],
      { useNativeDriver: USE_NATIVE_DRIVER }
    );

    // Preserves offset
    this._translateYOffset = new Animated.Value(INITIAL_TRANSLATE_Y_OFFSET);

    // Value fed in directly from PanGestureHandler#drawer
    this._drawerDragY = new Animated.Value(0);
    this._onGestureEvent = Animated.event(
      [{ nativeEvent: { translationY: this._drawerDragY } }],
      { useNativeDriver: USE_NATIVE_DRIVER }
    );

    this.state = {
      drawerHidden: true,
      touchInitalScrollY: 0,
    };
  }

  _onHandlerStateChange = ({ nativeEvent }) => {
    if (nativeEvent.oldState === State.ACTIVE) {
      const { velocityY, translationY } = nativeEvent;
      const dragToss = 0.05;
      const endOffsetY = translationY + dragToss * velocityY;

      let toValue = INITIAL_TRANSLATE_Y_OFFSET;
      let hideDrawer = true;
      console.log('END OFFSET', endOffsetY);

      if (
        this.state.drawerHidden &&
        endOffsetY < -150 /* Should we show it? */
      ) {
        toValue = 50;
        hideDrawer = false;
      } else if (
        !this.state.drawerHidden &&
        endOffsetY < 150 /* Should we keep it open? */
      ) {
        toValue = 50;
        hideDrawer = false;
      }

      // Take the gesture end translateY and transfer it to
      // offset, so we can reset the drag
      this._translateYOffset.extractOffset();
      if (hideDrawer && !this.state.drawerHidden) {
        this._translateYOffset.setValue(translationY - this.state.touchInitalScrollY);
      } else {
        this._translateYOffset.setValue(translationY);
      }
      this._translateYOffset.flattenOffset();

      // No longer using the drawerDragY as our drawer position value, it's on the offset now
      this._drawerDragY.setValue(0);

      // Get rid of touch initial scroll Y, assuming that initial scrollY is always 0
      // (so that scroll view must be at the top when transitioning)
      this.setState({ drawerHidden: hideDrawer, touchInitalScrollY: 0 });

      Animated.spring(this._translateYOffset, {
        velocity: velocityY,
        tension: 68,
        friction: 12,
        toValue,
        useNativeDriver: USE_NATIVE_DRIVER,
      }).start();
    }
  };

  _logState = (id, { nativeEvent }) => {
    let oldStateName = getStateNameFromEnum(nativeEvent.oldState);
    let newStateName = getStateNameFromEnum(nativeEvent.state);
    console.log({ id, oldStateName, newStateName });
  };

  _logStateAndThen = (id, fn) => e => {
    this._logState(id, e);
    fn && fn(e);
  };

  _onStartScroll = e => {
    console.log(e.nativeEvent);
    const { contentOffset } = e.nativeEvent;
    this.setState({ touchInitalScrollY: contentOffset.y });
  };

  render() {
    if (this.state.drawerHidden) {
      this._dragUnlocked = this._drawerDragY;
    } else {
      this._unlockDrag = this._scrollY.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0],
        extrapolate: 'clamp',
      });

      this._dragUnlocked = Animated.add(
        Animated.multiply(
          this._unlockDrag,
          Animated.multiply(new Animated.Value(-1), new Animated.Value(this.state.touchInitalScrollY)),
        ),
        Animated.multiply(this._unlockDrag, this._drawerDragY)
      );
    }

    // This value is used by the drawer container -- it is bound bound to the translateY of the drawer container
    this._translateY = Animated.add(
      this._dragUnlocked,
      this._translateYOffset
    ).interpolate({
      inputRange: [50, 700],
      outputRange: [50, 700],
      extrapolate: 'clamp',
    });

    const noop = () => {};

    return (
      <View style={styles.container}>
        <PanGestureHandler
          id="masterdrawer"
          simultaneousHandlers="drawer"
          minDeltaY={HEIGHT}
          maxDeltaY={this.state.drawerHidden ? HEIGHT : 0}
          onHandlerStateChange={this._logStateAndThen('masterdrawer', noop)}>
          <View style={{ flex: 1 }}>
            <PanGestureHandler
              id="drawer"
              simultaneousHandlers={
                this.state.drawerHidden
                  ? ['scroll', 'masterdrawer']
                  : ['scroll']
              }
              onGestureEvent={this._onGestureEvent}
              onHandlerStateChange={this._logStateAndThen(
                'drawer',
                this._onHandlerStateChange
              )}>
              <Animated.View
                style={{
                  ...StyleSheet.absoluteFillObject,
                  transform: [{ translateY: this._translateY }],
                }}>
                <View
                  style={{ height: HEADER_HEIGHT, backgroundColor: 'red' }}
                />
                <NativeViewGestureHandler
                  id="scroll"
                  waitFor="masterdrawer"
                  onHandlerStateChange={this._logStateAndThen('scroll', noop)}
                  simultaneousHandlers="drawer">
                  <Animated.ScrollView
                    style={styles.scrollView}
                    bounces={false}
                    onScroll={this._onScroll}
                    onScrollBeginDrag={this._onStartScroll}
                    scrollEventThrottle={1}
                    contentContainerStyle={{ overflow: 'hidden' }}>
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
});
