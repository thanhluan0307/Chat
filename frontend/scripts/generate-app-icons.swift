import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

let project = URL(fileURLWithPath: #filePath)
    .deletingLastPathComponent().deletingLastPathComponent()
let fileManager = FileManager.default

func loadImage(_ relativePath: String) throws -> CGImage {
    let url = project.appendingPathComponent(relativePath)
    guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
          let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
        throw NSError(domain: "AppIcons", code: 1,
                      userInfo: [NSLocalizedDescriptionKey: "Cannot load \(relativePath)"])
    }
    return image
}

// Resize the artwork and apply only the platform's legacy circular mask.
func saveIcon(_ image: CGImage, pixels: Int, path: String,
              alpha: Bool = false, round: Bool = false) throws {
    let alphaInfo = alpha || round
        ? CGImageAlphaInfo.premultipliedLast : CGImageAlphaInfo.noneSkipLast
    guard let context = CGContext(
        data: nil, width: pixels, height: pixels, bitsPerComponent: 8,
        bytesPerRow: pixels * 4, space: CGColorSpace(name: CGColorSpace.sRGB)!,
        bitmapInfo: alphaInfo.rawValue
    ) else {
        throw NSError(domain: "AppIcons", code: 2)
    }
    let bounds = CGRect(x: 0, y: 0, width: pixels, height: pixels)
    context.interpolationQuality = .high
    if round {
        context.addEllipse(in: bounds)
        context.clip()
    }
    context.draw(image, in: bounds)
    let destination = project.appendingPathComponent(path)
    try fileManager.createDirectory(at: destination.deletingLastPathComponent(),
                                    withIntermediateDirectories: true)
    guard let rendered = context.makeImage(),
          let output = CGImageDestinationCreateWithURL(
              destination as CFURL, UTType.png.identifier as CFString, 1, nil
          ) else {
        throw NSError(domain: "AppIcons", code: 3)
    }
    CGImageDestinationAddImage(output, rendered, nil)
    guard CGImageDestinationFinalize(output) else {
        throw NSError(domain: "AppIcons", code: 4)
    }
}

let master = try loadImage("assets/app-icon/icon-1024.png")
let foreground = try loadImage("assets/app-icon/foreground.png")
let catalog = "ios/ChatApp/Images.xcassets/AppIcon.appiconset"
var images: [[String: String]] = []
var writtenSizes = Set<Int>()

func addIOSIcon(idiom: String, points: Double, scale: Int) throws {
    let pixels = Int((points * Double(scale)).rounded())
    let filename = "AppIcon-\(pixels).png"
    if writtenSizes.insert(pixels).inserted {
        try saveIcon(master, pixels: pixels, path: "\(catalog)/\(filename)")
    }
    let size = points == points.rounded() ? String(Int(points)) : String(points)
    images.append(["idiom": idiom, "size": "\(size)x\(size)",
                   "scale": "\(scale)x", "filename": filename])
}

for points in [20.0, 29.0, 40.0, 60.0] {
    for scale in [2, 3] {
        try addIOSIcon(idiom: "iphone", points: points, scale: scale)
    }
}
for points in [20.0, 29.0, 40.0, 76.0] {
    for scale in [1, 2] {
        try addIOSIcon(idiom: "ipad", points: points, scale: scale)
    }
}
try addIOSIcon(idiom: "ipad", points: 83.5, scale: 2)
try addIOSIcon(idiom: "ios-marketing", points: 1024, scale: 1)
let contents: [String: Any] = ["images": images,
                             "info": ["author": "xcode", "version": 1]]
let json = try JSONSerialization.data(withJSONObject: contents,
                                      options: [.prettyPrinted, .sortedKeys])
try (json + Data([0x0A])).write(to: project.appendingPathComponent("\(catalog)/Contents.json"))

let resources = "android/app/src/main/res"
for (density, pixels) in [("mdpi", 48), ("hdpi", 72), ("xhdpi", 96),
                           ("xxhdpi", 144), ("xxxhdpi", 192)] {
    try saveIcon(master, pixels: pixels,
                 path: "\(resources)/mipmap-\(density)/ic_launcher.png")
    try saveIcon(master, pixels: pixels,
                 path: "\(resources)/mipmap-\(density)/ic_launcher_round.png", round: true)
}
try saveIcon(foreground, pixels: 432,
             path: "\(resources)/drawable-nodpi/ic_launcher_foreground.png", alpha: true)
print("Generated \(images.count) iOS icon entries, 10 Android legacy icons, and adaptive foreground.")
