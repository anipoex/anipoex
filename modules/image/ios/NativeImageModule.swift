import ExpoModulesCore
import ExpoUI
import SDWebImage
import SwiftUI

public class NativeImageModule: Module {
  public func definition() -> ModuleDefinition {
    Name("Image")

    ExpoUIView(ImageView.self)
  }
}

struct ImageSource: Record {
  @Field var uri: String?
  @Field var headers: [String: String]?
}

enum ContentFit: String, Enumerable {
  case cover
  case contain
  case fill
}

public final class ImageViewProps: UIBaseViewProps {
  @Field var source: ImageSource?
  @Field var contentFit: ContentFit = .cover
  @Field var transition: Double = 250
  @Field var blurRadius: Double = 0
  var onLoad = EventDispatcher()
  var onError = EventDispatcher()
}

private let cacheTypes: [SDImageCacheType: String] = [.memory: "memory", .disk: "disk", .all: "disk"]

/// An image from an https or data URL, loaded and cached by SDWebImage
/// (expo-image's engine) and drawn by SwiftUI itself: a React Native view
/// hosted in a recycled `List` row can be taken by a row SwiftUI is
/// removing. Decoded at the size it's drawn, so it waits for a size.
public struct ImageView: ExpoSwiftUI.View {
  @ObservedObject public var props: ImageViewProps
  @Environment(\.displayScale) private var displayScale
  @State private var size = CGSize.zero
  @State private var loaded: (url: String, key: String, image: UIImage, cacheType: String)?

  public init(props: ImageViewProps) {
    self.props = props
  }

  public var body: some View {
    let url = props.source?.uri
    let source = url.flatMap { URL(string: $0) }
    let pixels = CGSize(width: (size.width * displayScale).rounded(.up), height: (size.height * displayScale).rounded(.up))
    let context = loadContext(pixels)
    // The thumbnail's own key, which carries its size.
    let key = pixels.width > 0 && pixels.height > 0 ? source.flatMap { SDWebImageManager.shared.cacheKey(for: $0, context: context) } : nil
    // A memory hit draws in the first frame, so a row scrolled back into view
    // doesn't fade in again.
    let hit = url.flatMap { url in
      key.flatMap { key in
        loaded?.key == key ? loaded : SDImageCache.shared.imageFromMemoryCache(forKey: key).map { (url: url, key: key, image: $0, cacheType: "memory") }
      }
    }
    // A resize keeps the old size's image until the new one loads.
    let shown = hit ?? (loaded?.url == url ? loaded : nil)
    Color.clear
      .overlay {
        if let shown {
          fitted(Image(uiImage: shown.image).resizable())
            // Opaque only when blurred, or a logo's transparent pixels could be
            // filled.
            .blur(radius: props.blurRadius, opaque: props.blurRadius > 0)
            .transition(.opacity)
            // A new view per url, so a recycled row reports its own load.
            .id(shown.url)
            // expo-image's load event, so a screen moves here by its import.
            .onAppear {
              props.onLoad([
                "cacheType": shown.cacheType,
                "source": [
                  "url": shown.url,
                  "width": shown.image.size.width,
                  "height": shown.image.size.height,
                  "mediaType": String?.none,
                ] as [String: Any?],
              ])
            }
        }
      }
      .clipped()
      .onGeometryChange(for: CGSize.self) { $0.size } action: { size = $0 }
      .task(id: key) {
        guard let url, let key, let source, hit == nil else { return }
        let duration = props.transition / 1000
        // No .scaleDownLargeImages: its byte limit replaces the thumbnail size.
        SDWebImageManager.shared.loadImage(with: source, options: [], context: context, progress: nil) { image, _, error, cacheType, _, _ in
          guard let image else {
            // A recycled row may have moved on to another url by now.
            if props.source?.uri == url { props.onError(["error": error?.localizedDescription ?? "Could not load the image"]) }
            return
          }
          withAnimation(duration > 0 ? .easeIn(duration: duration) : nil) { loaded = (url, key, image, cacheTypes[cacheType] ?? "none") }
        }
      }
  }

  private func loadContext(_ pixels: CGSize) -> [SDWebImageContextOption: Any] {
    var context: [SDWebImageContextOption: Any] = [.imageThumbnailPixelSize: NSValue(cgSize: pixels), .imageCoder: CoverCoder.shared]
    if let headers = props.source?.headers { context[.downloadRequestModifier] = SDWebImageDownloaderRequestModifier(headers: headers) }
    return context
  }

  @ViewBuilder
  private func fitted(_ image: Image) -> some View {
    switch props.contentFit {
    case .fill: image
    case .contain: image.aspectRatio(contentMode: .fit)
    case .cover: image.aspectRatio(contentMode: .fill)
    }
  }
}

/// Decodes at the smallest size that covers the thumbnail size, as Glide does
/// on Android: SDWebImage only fits the image inside it, which left a portrait
/// cover in a wide card half as sharp.
private final class CoverCoder: NSObject, SDImageCoder {
  static let shared = CoverCoder()

  func canDecode(from data: Data?) -> Bool {
    SDImageCodersManager.shared.canDecode(from: data)
  }

  func decodedImage(with data: Data?, options: [SDImageCoderOption: Any]? = nil) -> UIImage? {
    var options = options ?? [:]
    if let box = (options[.decodeThumbnailPixelSize] as? NSValue)?.cgSizeValue, let data,
      let source = CGImageSourceCreateWithData(data as CFData, nil),
      let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any],
      let width = properties[kCGImagePropertyPixelWidth] as? CGFloat, width > 0,
      let height = properties[kCGImagePropertyPixelHeight] as? CGFloat, height > 0
    {
      let scale = max(box.width / width, box.height / height)
      options[.decodeThumbnailPixelSize] = NSValue(cgSize: CGSize(width: (width * scale).rounded(.up), height: (height * scale).rounded(.up)))
    }
    return SDImageCodersManager.shared.decodedImage(with: data, options: options)
  }

  func canEncode(to format: SDImageFormat) -> Bool {
    SDImageCodersManager.shared.canEncode(to: format)
  }

  func encodedData(with image: UIImage?, format: SDImageFormat, options: [SDImageCoderOption: Any]? = nil) -> Data? {
    SDImageCodersManager.shared.encodedData(with: image, format: format, options: options)
  }
}
