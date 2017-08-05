import React, { Component } from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';
import {
  PanGestureHandler,
  NativeViewGestureHandler,
  State,
} from 'react-native-gesture-handler';

const USE_NATIVE_DRIVER = true;
const INITIAL_TRANSLATE_Y_OFFSET = 300; // Dimensions.get('window').height;

// PAN --contains--> SCROLL
// PAN: responsible for dragging drawer up and down
// SCROLL: it scrolls.

// so my first approach was to create two handlers: PAN and SCROLL inside of it
// PAN was responsible for dragging the drawer up and down (similar to what you do with swipeable rows but vertical)
// and SCROLL was for the content and it was placed in the container that can be panned
// then I set PAN and SCROLL to recognize simultanioulsy (with `simultaniousHandlers` property)
// and using pan event I created an animated value that would track the position of the panel
// then I created a value by interpolating panel position that would map to `scrollEnabled`
// with some changes to RN core that could work actually
// but anyways
// it only worked when the panel was up

// so my second approach was to get rid of scrollEnabled and add another Pan Handler on top of everything
// so I have MASTER_PAN > PAN > SCROLL
// now: MASTER_PAN and PAN can recognize simultaniously
// so do PAN and SCROLL but MASTER_PAN and SCROLL can not
// the I set SCROLL to `waitFor` MASTER_PAN
// and MASTER_PAN has `minDeltaY={INF}` and `maxDeltaY={panel_distance_from_top}`
// so that it fails as soon as you reach the top while dragging (edited)

// When scrolling up from bottom:
// - NativeGestureHandler>ScrollView#scroll waitsFor PanGestureHandler#masterdrawer to fail
// - PanGestureHandler#masterdrawer fails when within some distance from top

export default class App extends Component {
  constructor(props) {
    super(props);

    // Value fed in directly from Animated.ScrollView onScroll event
    this._scrollY = new Animated.Value(0);
    this._onScroll = Animated.event(
      [{ nativeEvent: { contentOffset: { y: this._scrollY } } }],
      { useNativeDriver: USE_NATIVE_DRIVER }
    );

    // Value fed in directly from PanGestureHandler#drawer
    this._drawerDragY = new Animated.Value(0);
    this._onGestureEvent = Animated.event(
      [{ nativeEvent: { translationY: this._drawerDragY } }],
      { useNativeDriver: USE_NATIVE_DRIVER }
    );

    // ..??
    this._translateYOffset = new Animated.Value(INITIAL_TRANSLATE_Y_OFFSET);

    // ..?
    this._drawerDragLock = this._scrollY.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    this._masterDrawerDragLock = this._scrollY.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 500],
    });

    // ..?
    this._dragUnlocked = Animated.multiply(this._drawerDragY, this._drawerDragLog);

    // This value is used by the drawer container, it is bound to its translateY
    this._translateY = Animated.add(
      this._dragUnlocked,
      this._translateYOffset
    ).interpolate({
      inputRange: [50, 500],
      outputRange: [50, 500],
      extrapolate: 'clamp',
    });

    this.state = {
      drawerHidden: true,
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
        endOffsetY < 150 /* Should we keep them open? */
      ) {
        toValue = 50;
        hideDrawer = false;
      }

      this._translateYOffset.extractOffset();
      this._translateYOffset.setValue(translationY);
      this._translateYOffset.flattenOffset();
      this._drawerDragY.setValue(0);

      this.setState({ drawerHidden: hideDrawer });

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

  render() {
    const noop = () => {};

    return (
      <View style={styles.container}>
        <PanGestureHandler
          id="masterdrawer"
          simultaneousHandlers="drawer"
          minDeltaY={500}
          maxDeltaY={this.state.drawerHidden ? 250 : 0}
          onHandlerStateChange={this._logStateAndThen('masterdrawer', noop)}>
          <View style={{ flex: 1 }}>
            <PanGestureHandler
              id="drawer"
              simultaneousHandlers={['scroll', 'masterdrawer']}
              onGestureEvent={this._onGestureEvent}
              onHandlerStateChange={this._logStateAndThen(
                'drawer',
                this._onHandlerStateChange
              )}>
              <Animated.View
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  right: 0,
                  bottom: 0,
                  transform: [{ translateY: this._translateY }],
                }}>
                <View style={{ height: 40, backgroundColor: 'red' }} />
                <NativeViewGestureHandler
                  id="scroll"
                  waitFor="masterdrawer"
                  onHandlerStateChange={this._logStateAndThen('scroll', noop)}
                  simultaneousHandlers="drawer">
                  <Animated.ScrollView
                    style={styles.scrollView}
                    bounces={false}
                    onScroll={this._onScroll}
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
  text: {},
});
